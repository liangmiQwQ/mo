import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import prompts from '@posva/prompts'
import { x } from 'tinyexec'
import untildify from 'untildify'
import type { SupportedShell } from '../utils/config'
import { getDefaultConfigPath, supportedShells } from '../utils/config'
import { error } from '../utils/error'
import { highlight, success, toTildePath } from '../utils/format'
import { syncManagedShellrc } from '../utils/shellrc'

type PromptQuestion = {
  type: string
  name: string
  message: string
  initial?: boolean
  choices?: Array<{ title: string; value: string }>
}

type PromptRunner = (
  question: PromptQuestion | PromptQuestion[],
  options?: { onCancel?: () => boolean | void },
) => Promise<Record<string, unknown>>

type CommandRunner = (command: string, args: string[]) => Promise<{ exitCode: number }>

type SetupDeps = {
  prompt: PromptRunner
  runCommand: CommandRunner
  syncShellrc: (shells: SupportedShell[], binName: string) => Promise<void>
}

const CONFIG_SCHEMA_URL = 'https://raw.githubusercontent.com/liangmiQwQ/ghm/main/config_schema.json'

const defaultDeps: SetupDeps = {
  prompt: prompts as PromptRunner,
  runCommand: async (command, args) => {
    const result = await x(command, args, { throwOnError: false })
    return { exitCode: result.exitCode ?? 1 }
  },
  syncShellrc: syncManagedShellrc,
}

export type SetupCommandOptions = {
  configPath?: string
  binName: string
}

export async function runSetupCommand(
  options: SetupCommandOptions,
  deps: Partial<SetupDeps> = {},
): Promise<void> {
  const allDeps = { ...defaultDeps, ...deps }
  const configPath = resolveConfigPath(options.configPath)

  if (existsSync(configPath)) {
    error(`Config file already exists at ${toTildePath(configPath)}.`, 78)
  }

  await ensureToolReady('git', ['--version'], allDeps.runCommand)
  await ensureGhAuthenticated(allDeps.runCommand)

  const rootInput = await promptText(
    allDeps.prompt,
    'What directory would you like to store all your projects?',
    'root',
  )
  const rootPath = await resolveAndValidateRootPath(rootInput)

  const selectedShells = await promptShellSelection(allDeps.prompt)
  await ensureShellCommandsAvailable(selectedShells, allDeps.runCommand)

  await writeConfigFile(configPath, rootPath, selectedShells)
  await allDeps.syncShellrc(selectedShells, options.binName)

  success(`Setup completed. Config written to ${highlight(toTildePath(configPath))}`)
}

export async function promptRunSetupOnMissingConfig(
  runSetup: () => Promise<void>,
  deps: Partial<Pick<SetupDeps, 'prompt'>> = {},
): Promise<void> {
  const prompt = deps.prompt ?? defaultDeps.prompt
  const confirmed = await promptConfirm(
    prompt,
    'No config found, would you like to run `ghm setup` first? (Y / N)',
    'runSetup',
  )

  if (confirmed) {
    await runSetup()
    return
  }

  error('No config found. Setup is required before running this command.', 78)
}

function resolveConfigPath(configPath?: string): string {
  if (!configPath) {
    return getDefaultConfigPath()
  }
  return path.resolve(configPath)
}

async function ensureToolReady(
  command: string,
  args: string[],
  runCommand: CommandRunner,
): Promise<void> {
  try {
    const result = await runCommand(command, args)
    if (result.exitCode === 0) {
      return
    }
  } catch {
    // fall through to standardized error
  }

  error(`Required tool "${command}" is unavailable.`, 69)
}

async function ensureGhAuthenticated(runCommand: CommandRunner): Promise<void> {
  try {
    const result = await runCommand('gh', ['auth', 'status'])
    if (result.exitCode === 0) {
      return
    }
  } catch {
    // fall through to standardized error
  }

  error('GitHub CLI `gh` is missing or not authenticated.', 69)
}

async function resolveAndValidateRootPath(input: string): Promise<string> {
  const trimmed = input.trim()
  if (!trimmed) {
    error('Invalid path: root directory cannot be empty.', 78)
  }

  const rootPath = path.resolve(untildify(trimmed))

  let isDirectory = false
  try {
    await mkdir(rootPath, { recursive: true })
    const info = await stat(rootPath)
    isDirectory = info.isDirectory()
  } catch {
    isDirectory = false
  }

  if (!isDirectory) {
    error(`Invalid path: ${rootPath}`, 78)
  }

  return rootPath
}

async function promptShellSelection(prompt: PromptRunner): Promise<SupportedShell[]> {
  const answer = await prompt(
    {
      type: 'multiselect',
      name: 'shells',
      message: 'What kind of shell would you use?',
      choices: [
        { title: 'zsh (~/.zshrc)', value: 'zsh' },
        { title: 'fish (~/.config/fish/config.fish)', value: 'fish' },
        { title: 'bash (~/.bashrc)', value: 'bash' },
      ],
    },
    {
      onCancel: () => {
        error('Setup canceled.', 78)
      },
    },
  )

  const value = answer.shells
  if (!Array.isArray(value)) {
    error('At least one shell must be selected.', 78)
  }

  const selected = [
    ...new Set(value.filter((shell): shell is SupportedShell => isSupportedShell(shell))),
  ]
  if (!selected.length) {
    error('At least one shell must be selected.', 78)
  }

  return selected
}

async function ensureShellCommandsAvailable(
  shells: SupportedShell[],
  runCommand: CommandRunner,
): Promise<void> {
  for (const shell of shells) {
    await ensureToolReady(shell, ['--version'], runCommand)
  }
}

async function writeConfigFile(
  configPath: string,
  rootPath: string,
  shells: SupportedShell[],
): Promise<void> {
  const content = `${JSON.stringify(
    {
      $schema: CONFIG_SCHEMA_URL,
      root: rootPath,
      shells,
    },
    null,
    2,
  )}\n`
  await mkdir(path.dirname(configPath), { recursive: true })
  await writeFile(configPath, content, 'utf8')
}

async function promptText(prompt: PromptRunner, message: string, name: string): Promise<string> {
  const answer = await prompt(
    {
      type: 'text',
      name,
      message,
    },
    {
      onCancel: () => {
        error('Setup canceled.', 78)
      },
    },
  )

  const value = answer[name]
  return typeof value === 'string' ? value : ''
}

async function promptConfirm(
  prompt: PromptRunner,
  message: string,
  name: string,
): Promise<boolean> {
  const answer = await prompt(
    {
      type: 'confirm',
      name,
      message,
      initial: true,
    },
    {
      onCancel: () => {
        error('Setup canceled.', 78)
      },
    },
  )

  return Boolean(answer[name])
}

function isSupportedShell(value: unknown): value is SupportedShell {
  return typeof value === 'string' && supportedShells.includes(value as SupportedShell)
}
