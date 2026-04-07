import { existsSync } from 'node:fs'
import { cac } from 'cac'
import { version } from '../package.json'
import { error } from './utils/error'
import type { GlobalUserConfig } from './utils/config'
import { checkRestartRequired, preventRunning, userBinName } from './utils/runner'

const cli = cac(userBinName)
await preventRunning()
checkRestartRequired()

function withConfig<T extends any[]>(
  handler: (config: GlobalUserConfig, ...args: T) => Promise<void> | void,
) {
  return async (...args: T): Promise<void> => {
    const { getDefaultConfigPath, loadConfig } = await import('./utils/config')
    const configPath = getDefaultConfigPath()

    if (!existsSync(configPath)) {
      const { promptRunSetupOnMissingConfig, runSetupCommand } = await import('./commands/setup')
      await promptRunSetupOnMissingConfig(runSetupCommand)
      return
    }

    const config = loadConfig()
    await syncShellrcForRun(config)
    return handler(config, ...args)
  }
}

cli.command('setup', 'Setup config and shell integration for mo').action(async () => {
  const { runSetupCommand } = await import('./commands/setup')
  await runSetupCommand()
})

cli
  .command('clone <repo>', 'Clone a repository to <root>/<owner>/<repo>')
  .alias('c')
  .action(
    withConfig(async (config, repo: string) => {
      const { runCloneCommand } = await import('./commands/clone')
      await runCloneCommand(repo, config)
    }),
  )

cli
  .command('list', 'List repositories under configured root')
  .alias('ls')
  .action(
    withConfig(async (config) => {
      const { runListCommand } = await import('./commands/list')
      await runListCommand(config)
    }),
  )

cli
  .command('cd [target]', 'Resolve a repository path for shell navigation')
  .alias('d')
  .action(
    withConfig(async (config, target?: string) => {
      const { runCdCommand } = await import('./commands/cd')
      await runCdCommand(target, config)
    }),
  )

cli
  .command('edit [target]', 'Open a repository in your editor')
  .alias('e')
  .option('-e, --editor <editor>', 'Editor to use (overrides config)')
  .action(
    withConfig(async (config, target?: string, options?: { editor?: string }) => {
      const { runEditCommand } = await import('./commands/edit')
      await runEditCommand(target, config, options ?? {})
    }),
  )

cli
  .command('open [target]', 'Open a repository in system file explorer')
  .alias('o')
  .action(
    withConfig(async (config, target?: string) => {
      const { runOpenCommand } = await import('./commands/edit')
      await runOpenCommand(target, config)
    }),
  )

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
    const { syncShellrc } = await import('./utils/shellrc')
    await syncShellrc(config.shells)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Failed to sync shellrc: ${message}`)
  }
}
