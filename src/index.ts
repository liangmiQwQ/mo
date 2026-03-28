import { cac } from 'cac'
import { version } from '../package.json'
import { loadConfig } from './config/config'
import { runCloneCommand } from './commands/clone'
import { runListCommand } from './commands/list'
import { error } from './output/error'
import { syncManagedShellrc } from './shell/shellrc'
import type { GlobalUserConfig } from './config/config'

const cli = cac('ghm')

type GlobalOptions = { config?: string }

function withConfig<T extends any[]>(
  handler: (config: GlobalUserConfig, ...args: T) => Promise<void> | void,
) {
  return async (...args: T): Promise<void> => {
    const options = args[args.length - 1] as GlobalOptions
    const config = loadConfig(options.config)
    await syncShellrcForRun(config)
    return handler(config, ...args)
  }
}

cli.option('-c, --config <path>', 'Use a custom config file path')

cli
  .command('clone <repo>', 'Clone a repository to <root>/<owner>/<repo>')
  .alias('c')
  .action(
    withConfig(async (config, repo: string) => {
      await runCloneCommand(repo, config)
    }),
  )

cli
  .command('list', 'List repositories under configured root')
  .alias('ls')
  .action(
    withConfig(async (config) => {
      await runListCommand(config)
    }),
  )

cli.help()
cli.version(version || '0.0.0')

try {
  cli.parse()
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  error(message.charAt(0).toUpperCase() + message.slice(1))
}

async function syncShellrcForRun(config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    await syncManagedShellrc(config.shells)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Failed to sync shellrc: ${message}`)
  }
}
