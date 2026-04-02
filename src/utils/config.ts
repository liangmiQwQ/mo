import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import untildify from 'untildify'

import { parse } from 'jsonc-parser'
import type { CommandAliasConfig } from './alias'
import { aliasCommands, isAliasCommand, isLegacyAliasCommand, isValidAliasName } from './alias'

import { error } from './error'

export const supportedShells = ['zsh', 'bash', 'fish'] as const
export type SupportedShell = (typeof supportedShells)[number]

export type GlobalUserConfig = {
  root: string
  // For the future use
  editor?: string
  shells: SupportedShell[]
  alias?: CommandAliasConfig
}

export function getDefaultConfigPath(): string {
  return path.join(homedir(), '.config', 'morc.json')
}

export function loadConfig(): GlobalUserConfig {
  const configFilePath = getDefaultConfigPath()

  if (!existsSync(configFilePath)) {
    error(`Couldn't find config file at ${configFilePath}`)
  }

  const content = readFileSync(configFilePath, 'utf8').trim()

  return parseConfig(content, configFilePath)
}

function parseConfig(jsonc: string, configFilePath: string): GlobalUserConfig {
  const invalidConfigError = (message: string) =>
    error(`Invalid config: ${message} at ${configFilePath}`)

  if (!jsonc) {
    invalidConfigError('Empty file found')
  }

  const config = parse(jsonc, undefined, { allowTrailingComma: true })

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    invalidConfigError('Config must be an object')
  }

  const shells = parseShells(config.shells, invalidConfigError)
  const alias = parseAliasConfig(config.alias, invalidConfigError)

  const root = config.root
  if (typeof root !== 'string' || !root) {
    invalidConfigError('"root" must be a non-empty string')
  }

  const rootPath = path.resolve(path.dirname(configFilePath), untildify(root))

  if (!existsSync(rootPath)) {
    invalidConfigError(`"root" directory does not exist`)
  }

  if (!statSync(rootPath).isDirectory()) {
    invalidConfigError(`"root" path is not a directory`)
  }

  return {
    root: rootPath,
    ...(config.editor ? { editor: String(config.editor) } : {}),
    shells,
    ...(alias ? { alias } : {}),
  }
}

function parseShells(
  value: unknown,
  invalidConfigError: (message: string) => never,
): SupportedShell[] {
  if (value == null) {
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
        `"shells" contains unsupported shell "${shell}". Supported: ${supportedShells.join(', ')}`,
      )
    }

    normalized.add(normalizedShell as SupportedShell)
  }

  if (!normalized.size) {
    invalidConfigError('"shells" must contain at least one shell')
  }

  return [...normalized]
}

function parseAliasConfig(
  value: unknown,
  invalidConfigError: (message: string) => never,
): CommandAliasConfig | undefined {
  if (value == null) {
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
        `"alias" contains unsupported command "${command}". Supported: ${aliasCommands.join(', ')}`,
      )
    }

    if (!Array.isArray(aliases)) {
      invalidConfigError(`"alias.${command}" must be an array`)
    }

    const aliasValues = aliases.map((aliasName) => {
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
  invalidConfigError: (message: string) => never,
): string[] {
  const normalized = new Set<string>()

  for (const aliasName of aliases) {
    if (!aliasName) {
      continue
    }

    if (!isValidAliasName(aliasName)) {
      invalidConfigError(
        `"alias.${command}" contains invalid alias "${aliasName}". Alias must match [A-Za-z_][A-Za-z0-9_-]*`,
      )
    }

    normalized.add(aliasName)
  }

  return [...normalized]
}
