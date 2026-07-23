import path from 'node:path'

import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { parseGitHubRepo } from '../utils/github.ts'
import { runCloneCommand } from './clone.ts'
import { runForkCommand } from './fork.ts'
import type { ForkOptions } from './fork.ts'

const mainCommands = ['clone', 'fork'] as const
export type CompositionMainCommand = (typeof mainCommands)[number]

export type CompositionOptions = ForkOptions

interface CompositionTarget {
  path: string
  spec: string
}

export async function runCompositionMainCommand(
  mainCommand: CompositionMainCommand,
  repo: string,
  config: GlobalUserConfig,
  options: CompositionOptions
): Promise<CompositionTarget> {
  const parsedRepo = parseGitHubRepo(repo)
  const spec = `${parsedRepo.owner}/${parsedRepo.name}`

  if (mainCommand === 'clone') {
    if (options.org || options.name) {
      error('`mo composition clone` does not support fork options.')
    }
    await runCloneCommand(repo, config)
  } else {
    await runForkCommand(repo, config, options)
  }

  // Forks keep the source owner/name locally, so both main commands resolve to the same path.
  return {
    path: path.join(config.root, parsedRepo.owner, parsedRepo.name),
    spec
  }
}

export function parseCompositionMainCommand(command: string): CompositionMainCommand {
  if (mainCommands.includes(command as CompositionMainCommand)) {
    return command as CompositionMainCommand
  }

  return error(
    `Invalid composition main command "${command}". Supported: ${mainCommands.join(', ')}`
  )
}
