export const aliasCommands = ['ghm', 'clone', 'list', 'cd'] as const
export type AliasCommand = (typeof aliasCommands)[number]
export type CommandAliasConfig = Partial<Record<AliasCommand, string[]>>

export const defaultAliases: Record<AliasCommand, string> = {
  ghm: 'i',
  clone: 'k',
  list: 'li',
  cd: 'j',
}

const aliasNameRegex = /^[A-Za-z_][A-Za-z0-9_-]*$/

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
  toAliasLine: (name: string, target: string) => string,
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

  return lines
}

export function getAliasPromptLabel(command: AliasCommand): string {
  return command === 'ghm' ? 'ghm' : `ghm ${command}`
}

export function isAliasCommand(value: string): value is AliasCommand {
  return aliasCommands.includes(value as AliasCommand)
}

export function isValidAliasName(value: string): boolean {
  return aliasNameRegex.test(value)
}

function getAliasTarget(command: AliasCommand): string {
  if (command === 'ghm') {
    return 'ghm'
  }

  return `ghm ${command}`
}
