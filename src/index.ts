import { existsSync } from 'node:fs'
import { cac } from 'cac'
import { version, bin } from '../package.json'
import { getDefaultConfigPath, loadConfig, supportedShells } from './config/config'
import { runCloneCommand } from './commands/clone'
import { runListCommand } from './commands/list'
import { promptRunSetupOnMissingConfig, runSetupCommand } from './commands/setup'
import { generateShellIntegration, isValidShell } from './commands/shell'
import { error } from './output/error'
import { syncManagedShellrc } from './shell/shellrc'
import type { GlobalUserConfig } from './config/config'

const binName = Object.keys(bin)[0]
const cli = cac(binName)

type GlobalOptions = { config?: string }
type CommandActionArgs = unknown[]

function withConfig<T extends any[]>(
  handler: (config: GlobalUserConfig, ...args: T) => Promise<void> | void,
) {
  return async (...args: T): Promise<void> => {
    const options = args[args.length - 1] as GlobalOptions
    const configPath = options.config ? options.config : getDefaultConfigPath()

    if (!options.config && !existsSync(configPath)) {
      await promptRunSetupOnMissingConfig(() =>
        runSetupCommand({
          configPath,
          binName,
        }),
      )
      return
    }

    const config = loadConfig(options.config)
    await syncShellrcForRun(config)
    return handler(config, ...args)
  }
}

cli.option('-c, --config <path>', 'Use a custom config file path')

cli
  .command('setup', 'Setup config and shell integration for ghm')
  .action(async (...args: CommandActionArgs) => {
    const options = getGlobalOptions(args)
    await runSetupCommand({
      configPath: options.config,
      binName,
    })
  })

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

cli.command('shell <shell>', 'Generate shell integration code').action(
  withConfig((config, shell: string) => {
    // Gateway: prevent duplicate loading via shellrc
    if (process.env.GHM_SHELL_LOADED) {
      process.exit(2)
    }
    if (!isValidShell(shell)) {
      error(`Invalid shell "${shell}". Supported: ${supportedShells.join(', ')}`)
    }
    if (!config.shells.includes(shell)) {
      error(
        `Shell "${shell}" is not enabled in config "shells". Enabled: ${config.shells.join(', ')}`,
      )
    }
    console.log(generateShellIntegration(shell, binName))
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
    await syncManagedShellrc(config.shells, binName)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Failed to sync shellrc: ${message}`)
  }
}

function getGlobalOptions(args: CommandActionArgs): GlobalOptions {
  const maybeOptions = args[args.length - 1]
  return (maybeOptions && typeof maybeOptions === 'object' ? maybeOptions : {}) as GlobalOptions
}
