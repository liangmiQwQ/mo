import { readFile, stat } from 'node:fs/promises'

import type { CommandAliasConfig } from './alias.ts'
import { aliasCommands, isAliasCommand, isLegacyAliasCommand, isValidAliasName } from './alias.ts'
import { error } from './error.ts'
import { pathExists } from './fs.ts'
import { getDefaultConfigPath, parseJsonc, resolveRootFromConfig } from './root.ts'

export { getDefaultConfigPath, resolveRootPath } from './root.ts'

export const supportedShells = ['zsh', 'bash', 'fish'] as const
export type SupportedShell = (typeof supportedShells)[number]

export interface GlobalUserConfig {
  root: string
  // For the future use
  editor?: string
  shells: SupportedShell[]
  alias?: CommandAliasConfig
  compositionAlias: boolean
}

export async function loadConfig(): Promise<GlobalUserConfig> {
  const configFilePath = getDefaultConfigPath()

  if (!(await pathExists(configFilePath))) {
    error(`Couldn't find config file at ${configFilePath}`)
  }

  const content = (await readFile(configFilePath, 'utf8')).trim()

  return parseConfig(content, configFilePath)
}

async function parseConfig(jsonc: string, configFilePath: string): Promise<GlobalUserConfig> {
  const invalidConfigError = (message: string): never =>
    error(`Invalid config: ${message} at ${configFilePath}`)

  if (!jsonc) {
    invalidConfigError('Empty file found')
  }

  const config = parseJsonc(jsonc)

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    invalidConfigError('Config must be an object')
  }

  const configRecord = config as Record<string, unknown>
  const shells = parseShells(configRecord.shells, invalidConfigError)
  const alias = parseAliasConfig(configRecord.alias, invalidConfigError)
  const compositionAlias = parseCompositionAlias(configRecord.compositionAlias, invalidConfigError)

  const rootPath =
    resolveRootFromConfig(configRecord, configFilePath) ??
    invalidConfigError('"root" must be a non-empty string')
  const { editor } = configRecord

  if (!(await pathExists(rootPath))) {
    invalidConfigError(`"root" directory does not exist`)
  }

  if (!(await stat(rootPath)).isDirectory()) {
    invalidConfigError(`"root" path is not a directory`)
  }

  return {
    root: rootPath,
    ...(typeof editor === 'string' && editor ? { editor } : {}),
    shells,
    ...(alias ? { alias } : {}),
    compositionAlias
  }
}

function parseCompositionAlias(
  value: unknown,
  invalidConfigError: (message: string) => never
): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value !== 'boolean') {
    invalidConfigError('"compositionAlias" must be a boolean')
  }

  return value
}

function parseShells(
  value: unknown,
  invalidConfigError: (message: string) => never
): SupportedShell[] {
  if (value === null || value === undefined) {
    invalidConfigError('"shells" must be provided with at least one shell')
  }

  if (!Array.isArray(value)) {
    invalidConfigError('"shells" must be an array')
  }

  const normalized = new Set<SupportedShell>()

  for (const shell of value) {
    if (typeof shell !== 'string') {
      invalidConfigError('"shells" must contain strings only')
    }

    const normalizedShell = shell.trim().toLowerCase()
    if (!normalizedShell) {
      continue
    }

    if (!supportedShells.includes(normalizedShell as SupportedShell)) {
      invalidConfigError(
        `"shells" contains unsupported shell "${shell}". Supported: ${supportedShells.join(', ')}`
      )
    }

    normalized.add(normalizedShell as SupportedShell)
  }

  if (normalized.size === 0) {
    invalidConfigError('"shells" must contain at least one shell')
  }

  return [...normalized]
}

function parseAliasConfig(
  value: unknown,
  invalidConfigError: (message: string) => never
): CommandAliasConfig | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    invalidConfigError('"alias" must be an object')
  }

  const alias = value as Record<string, unknown>
  const parsed: CommandAliasConfig = {}

  for (const [command, aliases] of Object.entries(alias)) {
    if (!isLegacyAliasCommand(command)) {
      invalidConfigError(
        `"alias" contains unsupported command "${command}". Supported: ${aliasCommands.join(', ')}`
      )
    }

    if (!Array.isArray(aliases)) {
      invalidConfigError(`"alias.${command}" must be an array`)
    }

    const aliasValues = aliases.map(aliasName => {
      if (typeof aliasName !== 'string') {
        invalidConfigError(`"alias.${command}" must contain strings only`)
      }
      return aliasName.trim()
    })

    const normalized = normalizeAliasValues(aliasValues, command, invalidConfigError)

    if (command === 'mo') {
      continue
    }

    if (normalized.length > 0 && isAliasCommand(command)) {
      parsed[command] = normalized
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

function normalizeAliasValues(
  aliases: string[],
  command: string,
  invalidConfigError: (message: string) => never
): string[] {
  const normalized = new Set<string>()

  for (const aliasName of aliases) {
    if (!aliasName) {
      continue
    }

    if (!isValidAliasName(aliasName)) {
      invalidConfigError(
        `"alias.${command}" contains invalid alias "${aliasName}". Alias must match [A-Za-z_][A-Za-z0-9_-]*`
      )
    }

    normalized.add(aliasName)
  }

  return [...normalized]
}
