import { userBinName } from './runner.ts'

export const aliasCommands = ['clone', 'list', 'cd', 'edit', 'open', 'fork', 'init'] as const
export type AliasCommand = (typeof aliasCommands)[number]
export type CommandAliasConfig = Partial<Record<AliasCommand, string[]>>
export const legacyAliasCommands = ['mo', ...aliasCommands] as const
export type LegacyAliasCommand = (typeof legacyAliasCommands)[number]

export const defaultAliases: Record<AliasCommand, string> = {
  clone: 'k',
  list: 'li',
  cd: 'i',
  edit: 'e',
  open: 'o',
  fork: 'fr',
  init: 'in'
}

const aliasNameRegex = /^[A-Za-z_][A-Za-z0-9_-]*$/u

export function parseAliasInput(input: string, onInvalid?: (aliasName: string) => never): string[] {
  const trimmed = input.trim()
  if (!trimmed) {
    return []
  }

  const parsed = new Set<string>()
  for (const alias of trimmed.split(',')) {
    const value = alias.trim()
    if (!value) {
      continue
    }

    if (!isValidAliasName(value)) {
      if (onInvalid) {
        onInvalid(value)
      }
      continue
    }

    parsed.add(value)
  }

  return [...parsed]
}

export function buildAliasLines(
  aliases: CommandAliasConfig,
  compositionAlias: boolean,
  toAliasLine: (name: string, target: string) => string
): string[] {
  const lines: string[] = []
  const used = new Set<string>()

  for (const command of aliasCommands) {
    const target = getAliasTarget(command)
    const names = aliases[command]
    if (!names?.length) {
      continue
    }

    for (const aliasName of names) {
      if (!isValidAliasName(aliasName) || used.has(aliasName)) {
        continue
      }

      used.add(aliasName)
      lines.push(toAliasLine(aliasName, target))
    }
  }

  if (compositionAlias) {
    lines.push(...buildCompositionAliasLines(aliases, used, toAliasLine))
  }

  return lines
}

export function getAliasPromptLabel(command: AliasCommand): string {
  return `${userBinName} ${command}`
}

export function isAliasCommand(value: string): value is AliasCommand {
  return aliasCommands.includes(value as AliasCommand)
}

export function isLegacyAliasCommand(value: string): value is LegacyAliasCommand {
  return legacyAliasCommands.includes(value as LegacyAliasCommand)
}

export function isValidAliasName(value: string): boolean {
  return aliasNameRegex.test(value)
}

function getAliasTarget(command: AliasCommand): string {
  return `${userBinName} ${command}`
}

function buildCompositionAliasLines(
  aliases: CommandAliasConfig,
  used: Set<string>,
  toAliasLine: (name: string, target: string) => string
): string[] {
  const lines: string[] = []
  const subCommandGroups = getSubCommandAliasGroups(aliases)

  for (const mainCommand of ['clone', 'fork'] as const) {
    const mainAliases = aliases[mainCommand]
    if (!mainAliases?.length) {
      continue
    }

    for (const mainAlias of mainAliases) {
      for (const sequence of getSubCommandSequences(subCommandGroups)) {
        const aliasNames = sequence.map(item => item.alias)
        const aliasName = `${mainAlias}${aliasNames.join('')}`

        if (!isValidAliasName(aliasName) || used.has(aliasName)) {
          continue
        }

        used.add(aliasName)
        const commands = sequence.map(item => item.command).join(',')
        lines.push(toAliasLine(aliasName, `${userBinName} composition ${mainCommand} ${commands}`))
      }
    }
  }

  return lines
}

function getSubCommandAliasGroups(
  aliases: CommandAliasConfig
): { command: 'cd' | 'edit' | 'open'; aliases: string[] }[] {
  return (['cd', 'edit', 'open'] as const)
    .map(command => ({ command, aliases: aliases[command] ?? [] }))
    .filter(item => item.aliases.length > 0)
}

function getSubCommandSequences(
  groups: { command: 'cd' | 'edit' | 'open'; aliases: string[] }[]
): { command: 'cd' | 'edit' | 'open'; alias: string }[][] {
  const sequences: { command: 'cd' | 'edit' | 'open'; alias: string }[][] = []

  for (let length = 1; length <= groups.length; length++) {
    appendSubCommandSequences(groups, length, [], sequences)
  }

  return sequences
}

function appendSubCommandSequences(
  groups: { command: 'cd' | 'edit' | 'open'; aliases: string[] }[],
  length: number,
  current: { command: 'cd' | 'edit' | 'open'; alias: string }[],
  sequences: { command: 'cd' | 'edit' | 'open'; alias: string }[][]
): void {
  if (current.length === length) {
    sequences.push(current)
    return
  }

  const usedCommands = new Set(current.map(item => item.command))
  for (const group of groups) {
    if (usedCommands.has(group.command)) {
      continue
    }

    for (const alias of group.aliases) {
      appendSubCommandSequences(
        groups,
        length,
        [...current, { command: group.command, alias }],
        sequences
      )
    }
  }
}
