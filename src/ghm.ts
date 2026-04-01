import { existsSync } from 'node:fs'
import { cac } from 'cac'
import { version } from '../package.json'
import { getDefaultConfigPath, loadConfig } from './utils/config'
import { runCloneCommand } from './commands/clone'
import { runCdCommand } from './commands/cd'
import { runListCommand } from './commands/list'
import { promptRunSetupOnMissingConfig, runSetupCommand } from './commands/setup'
import { error } from './utils/error'
import { syncShellrc } from './utils/shellrc'
import type { GlobalUserConfig } from './utils/config'
import { preventRunning, userBinName } from './utils/runner'

const cli = cac(userBinName)
await preventRunning()

function withConfig<T extends any[]>(
  handler: (config: GlobalUserConfig, ...args: T) => Promise<void> | void,
) {
  return async (...args: T): Promise<void> => {
    const configPath = getDefaultConfigPath()

    if (!existsSync(configPath)) {
      await promptRunSetupOnMissingConfig(runSetupCommand)
      return
    }

    const config = loadConfig()
    await syncShellrcForRun(config)
    return handler(config, ...args)
  }
}

cli.command('setup', 'Setup config and shell integration for ghm').action(runSetupCommand)

cli
  .command('clone <repo>', 'Clone a repository to <root>/<owner>/<repo>')
  .alias('c')
  .action(withConfig((config, repo: string) => runCloneCommand(repo, config)))

cli
  .command('list', 'List repositories under configured root')
  .alias('ls')
  .action(withConfig(runListCommand))

cli
  .command('cd [target]', 'Resolve a repository path for shell navigation')
  .alias('d')
  .action(withConfig((config, target?: string) => runCdCommand(target, config)))

cli.help()
cli.version(version || '0.0.0')

try {
  cli.parse()

  if (!cli.matchedCommand) {
    cli.outputHelp()
    process.exit(cli.args.length > 0 ? 1 : 0)
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  error(message.charAt(0).toUpperCase() + message.slice(1))
}

async function syncShellrcForRun(config: GlobalUserConfig): Promise<void> {
  try {
    await syncShellrc(config.shells)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Failed to sync shellrc: ${message}`)
  }
}
