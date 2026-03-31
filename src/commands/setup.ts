import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import prompts from '@posva/prompts'
import untildify from 'untildify'
import type { SupportedShell } from '../utils/config'
import { getDefaultConfigPath, supportedShells } from '../utils/config'
import { syncShellrc } from '../utils/shellrc'
import { error } from '../utils/error'
import pc from 'picocolors'
import { success, toTildePath } from '../utils/format'
import { runCommand } from '../utils/commands'

const CONFIG_SCHEMA_URL = 'https://raw.githubusercontent.com/liangmiQwQ/ghm/main/config_schema.json'

export async function runSetupCommand(): Promise<void> {
  const configPath = getDefaultConfigPath()
  if (existsSync(configPath)) {
    error(`Config file already exists at ${toTildePath(configPath)}.`, 78)
  }

  await ensureToolReady('git', ['--version'])
  await ensureGhAuthenticated()

  const rootInput = await promptText(
    'What directory would you like to store all your projects?',
    'root',
  )
  const rootPath = await resolveAndValidateRootPath(rootInput)

  const selectedShells = await promptShellSelection()
  await ensureShellCommandsAvailable(selectedShells)

  await writeConfigFile(configPath, rootPath, selectedShells)
  await syncShellrc(selectedShells)

  success(`Setup completed. Config written to ${pc.cyan(toTildePath(configPath))}`)
}

export async function promptRunSetupOnMissingConfig(runSetup: () => Promise<void>): Promise<void> {
  const confirmed = await promptConfirm(
    'No config found, would you like to run `ghm setup` first?',
    'runSetup',
  )

  if (confirmed) {
    await runSetup()
    return
  }

  error('No config found. Setup is required before running this command.', 78)
}

async function ensureToolReady(command: string, args: string[]): Promise<void> {
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

async function ensureGhAuthenticated(): Promise<void> {
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

async function promptShellSelection(): Promise<SupportedShell[]> {
  const answer = await prompts(
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

async function ensureShellCommandsAvailable(shells: SupportedShell[]): Promise<void> {
  for (const shell of shells) {
    await ensureToolReady(shell, ['--version'])
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

async function promptText(message: string, name: string): Promise<string> {
  const answer = await prompts(
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

async function promptConfirm(message: string, name: string): Promise<boolean> {
  const answer = await prompts(
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
