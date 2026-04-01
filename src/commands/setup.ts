import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import untildify from 'untildify'
import type { SupportedShell } from '../utils/config'
import type { CommandAliasConfig } from '../utils/alias'
import { aliasCommands, defaultAliases, getAliasPromptLabel, parseAliasInput } from '../utils/alias'
import { getDefaultConfigPath, supportedShells } from '../utils/config'
import { syncShellrc } from '../utils/shellrc'
import { error } from '../utils/error'
import pc from 'picocolors'
import { success, toTildePath } from '../utils/format'
import { ensureToolReady, runCommand } from '../utils/commands'
import {
  promptConfirm,
  promptMultiselect,
  promptText,
  useSquareMultiselectIndicator,
} from '../utils/prompt'

const CONFIG_SCHEMA_URL = 'https://raw.githubusercontent.com/liangmiQwQ/ghm/main/config_schema.json'
const ALIAS_NAME_PATTERN = '[A-Za-z_][A-Za-z0-9_-]*'

useSquareMultiselectIndicator()

export async function runSetupCommand(): Promise<void> {
  const configPath = getDefaultConfigPath()
  if (existsSync(configPath)) {
    error(`Config file already exists at ${toTildePath(configPath)}.`, 78)
  }

  await ensureToolReady('git')
  await ensureGhAuthenticated()

  const rootInput = await promptText(
    'What directory would you like to store all your projects?',
    'root',
  )
  const rootPath = await resolveAndValidateRootPath(rootInput)

  const selectedShells = await promptShellSelection()
  await ensureShellCommandsAvailable(selectedShells)
  const aliases = await promptAliasConfig()

  await writeConfigFile(configPath, rootPath, selectedShells, aliases)
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
  const value = await promptMultiselect('What kind of shell would you use?', 'shells', [
    { title: 'zsh (~/.zshrc)', value: 'zsh' },
    { title: 'fish (~/.config/fish/config.fish)', value: 'fish' },
    { title: 'bash (~/.bashrc)', value: 'bash' },
  ])

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
    await ensureToolReady(shell)
  }
}

async function writeConfigFile(
  configPath: string,
  rootPath: string,
  shells: SupportedShell[],
  alias?: CommandAliasConfig,
): Promise<void> {
  const content = `${JSON.stringify(
    {
      $schema: CONFIG_SCHEMA_URL,
      root: rootPath,
      shells,
      ...(alias ? { alias } : {}),
    },
    null,
    2,
  )}\n`
  await mkdir(path.dirname(configPath), { recursive: true })
  await writeFile(configPath, content, 'utf8')
}

async function promptAliasConfig(): Promise<CommandAliasConfig | undefined> {
  const withAlias = await promptConfirm('Would you like to add alias for ghm use?', 'withAlias')
  if (!withAlias) {
    return undefined
  }

  const aliases: CommandAliasConfig = {}
  for (const command of aliasCommands) {
    const suggested = defaultAliases[command]
    const commandLabel = getAliasPromptLabel(command)
    const input = await promptText(`Aliases for "${commandLabel}" (optional)`, `alias_${command}`, {
      initial: suggested,
      validate: (value) => {
        try {
          parseAliasInput(value)
          return true
        } catch {
          return `Alias must match ${ALIAS_NAME_PATTERN}. Use commas for multiple aliases.`
        }
      },
    })
    const parsed = parseAliasInput(input, (aliasName) => {
      error(`Invalid alias "${aliasName}". Alias must match ${ALIAS_NAME_PATTERN}.`, 78)
    })
    if (parsed.length > 0) {
      aliases[command] = parsed
    }
  }

  return Object.keys(aliases).length > 0 ? aliases : undefined
}

function isSupportedShell(value: unknown): value is SupportedShell {
  return typeof value === 'string' && supportedShells.includes(value as SupportedShell)
}
