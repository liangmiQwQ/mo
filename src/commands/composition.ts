import type { GlobalUserConfig } from '../utils/config'
import { error } from '../utils/error'
import { parseGitHubRepo } from '../utils/github'
import { runCdCommand } from './cd'
import { runCloneCommand } from './clone'
import { runEditCommand, runOpenCommand } from './edit'
import { runForkCommand, type ForkOptions } from './fork'

const mainCommands = ['clone', 'fork'] as const
type CompositionMainCommand = (typeof mainCommands)[number]

const subCommands = ['cd', 'edit', 'open'] as const
type CompositionSubCommand = (typeof subCommands)[number]

export type CompositionOptions = ForkOptions

export async function runCompositionCommand(
  mainCommand: string,
  subCommandInput: string,
  repo: string,
  config: GlobalUserConfig,
  options: CompositionOptions,
): Promise<void> {
  const parsedMainCommand = parseMainCommand(mainCommand)
  const parsedSubCommands = parseSubCommands(subCommandInput)
  const parsedRepo = parseGitHubRepo(repo)
  const target = `${parsedRepo.owner}/${parsedRepo.name}`

  if (parsedMainCommand === 'clone') {
    if (options.org || options.name) {
      error('`mo composition clone` does not support fork options.')
    }
    await runCloneCommand(repo, config)
  } else {
    await runForkCommand(repo, config, options)
  }

  for (const subCommand of parsedSubCommands) {
    await runCompositionSubCommand(subCommand, target, config)
  }
}

function parseMainCommand(command: string): CompositionMainCommand {
  if (mainCommands.includes(command as CompositionMainCommand)) {
    return command as CompositionMainCommand
  }

  error(`Invalid composition main command "${command}". Supported: ${mainCommands.join(', ')}`)
}

function parseSubCommands(input: string): CompositionSubCommand[] {
  const commands = input
    .split(',')
    .map((command) => command.trim())
    .filter(Boolean)

  if (!commands.length) {
    error('Composition requires at least one sub command.')
  }

  return commands.map((command) => {
    if (subCommands.includes(command as CompositionSubCommand)) {
      return command as CompositionSubCommand
    }

    error(`Invalid composition sub command "${command}". Supported: ${subCommands.join(', ')}`)
  })
}

async function runCompositionSubCommand(
  command: CompositionSubCommand,
  target: string,
  config: GlobalUserConfig,
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
