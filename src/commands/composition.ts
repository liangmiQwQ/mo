import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { runCdCommand } from './cd.ts'
import { parseCompositionMainCommand, runCompositionMainCommand } from './composition-main.ts'
import type { CompositionOptions } from './composition-main.ts'
import { runEditCommand, runOpenCommand } from './edit.ts'

export type { CompositionOptions } from './composition-main.ts'

const subCommands = ['cd', 'edit', 'open'] as const
type CompositionSubCommand = (typeof subCommands)[number]

export async function runCompositionCommand(
  mainCommand: string,
  subCommandInput: string,
  repo: string,
  config: GlobalUserConfig,
  options: CompositionOptions
): Promise<void> {
  const parsedMainCommand = parseCompositionMainCommand(mainCommand)
  const parsedSubCommands = parseSubCommands(subCommandInput)
  const target = await runCompositionMainCommand(parsedMainCommand, repo, config, options)

  for (const subCommand of parsedSubCommands) {
    await runCompositionSubCommand(subCommand, target.spec, config)
  }
}

function parseSubCommands(input: string): CompositionSubCommand[] {
  const commands = input
    .split(',')
    .map(command => command.trim())
    .filter(Boolean)

  if (commands.length === 0) {
    error('Composition requires at least one sub command.')
  }

  return commands.map(command => {
    if (subCommands.includes(command as CompositionSubCommand)) {
      return command as CompositionSubCommand
    }

    return error(
      `Invalid composition sub command "${command}". Supported: ${subCommands.join(', ')}`
    )
  })
}

async function runCompositionSubCommand(
  command: CompositionSubCommand,
  target: string,
  config: GlobalUserConfig
): Promise<void> {
  if (command === 'cd') {
    await runCdCommand(target, config)
    return
  }

  if (command === 'edit') {
    await runEditCommand(target, config)
    return
  }

  await runOpenCommand(target, config)
}
