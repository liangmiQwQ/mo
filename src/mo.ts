import { cac } from 'cac'
import { shellrcGuard } from 'free-shellrc'

import { version } from '../package.json'
import { runCdCommand } from './commands/cd.ts'
import { runCloneCommand } from './commands/clone.ts'
import { runCompositionCommand } from './commands/composition.ts'
import type { CompositionOptions } from './commands/composition.ts'
import { runEditCommand } from './commands/edit.ts'
import { runForkCommand } from './commands/fork.ts'
import type { ForkOptions } from './commands/fork.ts'
import { runInitCommand } from './commands/init.ts'
import type { InitOptions } from './commands/init.ts'
import { runListCommand } from './commands/list.ts'
import { runOpenCommand } from './commands/open.ts'
import { promptRunSetupOnMissingConfig, runSetupCommand } from './commands/setup.ts'
import { getDefaultConfigPath, loadConfig } from './utils/config.ts'
import type { GlobalUserConfig } from './utils/config.ts'
import { error as printError } from './utils/error.ts'
import { pathExists } from './utils/fs.ts'
import { preventRunning, userBinName } from './utils/runner.ts'
import { syncShellrc } from './utils/shellrc.ts'

const shellrcDiagnostic = shellrcGuard(import.meta.url, userBinName)
if (shellrcDiagnostic) {
  printError(shellrcDiagnostic.message)
}

const cli = cac(userBinName)
await preventRunning()

function withConfig<T extends unknown[]>(
  handler: (config: GlobalUserConfig, ...args: T) => Promise<void> | void
) {
  return async (...args: T): Promise<void> => {
    const configPath = getDefaultConfigPath()

    if (!(await pathExists(configPath))) {
      await promptRunSetupOnMissingConfig(runSetupCommand)
      return
    }

    const config = await loadConfig()
    await syncShellrcForRun(config)
    return handler(config, ...args)
  }
}

cli.command('setup', 'Setup config and shell integration for mo').action(runSetupCommand)

cli
  .command('clone <repo>', 'Clone a GitHub repo or URL to <root>/<owner>/<repo>')
  .alias('c')
  .action(withConfig((config, repo: string) => runCloneCommand(repo, config)))

cli
  .command(
    'composition <main-command> <sub-commands> <repo>',
    'Run clone or fork, then run cd, edit, or open against the same repo'
  )
  .option('-o, --org <org>', 'GitHub org to fork into (fork main command only)')
  .option('-n, --name <name>', 'Name for the forked repository (fork main command only)')
  .action(
    withConfig(
      (
        config,
        mainCommand: string,
        subCommands: string,
        repo: string,
        options?: CompositionOptions
      ) => runCompositionCommand(mainCommand, subCommands, repo, config, options ?? {})
    )
  )

cli
  .command('fork [repo]', 'Fork a GitHub repo or URL, or fork the current project in place')
  .alias('f')
  .option('-o, --org <org>', 'GitHub org to fork into (overrides config)')
  .option('-n, --name <name>', 'Name for the forked repository')
  .action(
    withConfig((config, repo?: string, options?: ForkOptions) =>
      runForkCommand(repo, config, options ?? {})
    )
  )

cli
  .command('init', 'Initialize current directory as a new GitHub repository')
  .alias('i')
  .option('--public', 'Create as public repository (skip prompt)')
  .option('--private', 'Create as private repository (skip prompt)')
  .option('-p, --push', 'Push current branch after repo creation')
  .action(withConfig((config, options?: InitOptions) => runInitCommand(config, options ?? {})))

cli
  .command('list', 'List repositories under configured root')
  .alias('ls')
  .action(withConfig(runListCommand))

cli
  .command('cd [target]', 'Resolve the current project, root, owner, repo, or GitHub URL')
  .action(withConfig((config, target?: string) => runCdCommand(target, config)))

cli
  .command('edit [target]', 'Open the current project, root, owner, repo, or URL in your editor')
  .alias('e')
  .option('-e, --editor <editor>', 'Editor to use (overrides config)')
  .action(
    withConfig((config, target?: string, options?: { editor?: string }) =>
      runEditCommand(target, config, options ?? {})
    )
  )

cli
  .command('open [target]', 'Open the current project, root, owner, repo, or URL on GitHub')
  .alias('o')
  .action(withConfig((config, target?: string) => runOpenCommand(target, config)))

cli.help()
cli.version(version || '0.0.0')

try {
  cli.parse()

  if (!cli.matchedCommand) {
    cli.outputHelp()
    process.exit(cli.args.length > 0 ? 1 : 0)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  printError(message.charAt(0).toUpperCase() + message.slice(1))
}

async function syncShellrcForRun(config: GlobalUserConfig): Promise<void> {
  try {
    await syncShellrc(config.shells)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    printError(`Failed to sync shellrc: ${message}`)
  }
}
