import { cac } from 'cac'
import { version } from '../package.json'
import { loadConfig } from './config/config'
import { runCloneCommand } from './commands/clone'
import { runListCommand } from './commands/list'
import { error } from './output/error'
import { syncManagedShellrc } from './shell/shellrc'

const cli = cac('ghm')

cli.option('-c, --config <path>', 'Use a custom config file path')

cli
  .command('clone <repo>', 'Clone a repository to <root>/<owner>/<repo>')
  .alias('c')
  .action(async (repo: string, options: { config?: string }) => {
    const config = loadConfig(options.config)
    await syncShellrcForRun(config)
    await runCloneCommand(repo, config)
  })

cli
  .command('list', 'List repositories under configured root')
  .alias('ls')
  .action(async (options: { config?: string }) => {
    const config = loadConfig(options.config)
    await syncShellrcForRun(config)
    await runListCommand(config)
  })

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
    console.warn(`Failed to sync shellrc: ${message}`)
  }
}
