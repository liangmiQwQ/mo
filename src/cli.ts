#!/usr/bin/env node
import prompts from '@posva/prompts'
import { cac } from 'cac'
import { cloneRepo } from './lib/clone.js'
import { readConfig } from './lib/config.js'
import { GhmError } from './lib/error.js'
import { listRepos } from './lib/list.js'

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    // Handle help/version manually to ensure output goes through process.stdout
    // (which is mocked in tests) instead of cac's internal output method
    if (argv.includes('--help') || argv.includes('-h')) {
      process.stdout.write(`ghm/ghm

Usage:
  $ ghm <command> [options]

Commands:
  list          List repos under <root>
  clone [spec]  Clone repo into <root>/<owner>/<repo>

For more info, run any command with the \`--help\` flag:
  $ ghm list --help
  $ ghm clone --help

Options:
  --config <path>  Config file path (default: ~/.config/ghm.json)
  -v, --version    Display version number
  -h, --help       Display this message
`)
      return 0
    }

    if (argv.includes('--version') || argv.includes('-v')) {
      process.stdout.write('ghm\n')
      return 0
    }

    const cli = cac('ghm')

    cli.option('--config <path>', 'Config file path (default: ~/.config/ghm.json)')

    cli
      .command('list', 'List repos under <root>')
      .alias('ls')
      .action(async (options: { config?: string }) => {
        const { root } = await readConfig({ configPath: options.config })
        const repos = await listRepos(root)
        for (const repo of repos) process.stdout.write(`${repo}\n`)
      })

    cli
      .command('clone [spec]', 'Clone repo into <root>/<owner>/<repo>')
      .alias('c')
      .action(async (spec: string | undefined, options: { config?: string }) => {
        let resolvedSpec = spec
        if (!resolvedSpec) {
          if (!process.stdin.isTTY) throw new GhmError('Usage: ghm clone <owner>/<repo>', 2)

          const answers = await prompts(
            {
              type: 'text',
              name: 'spec',
              message: 'Repository (owner/repo):',
              initial: 'vitejs/vite',
            },
            {
              onCancel: () => {
                throw new GhmError('Cancelled', 130)
              },
            },
          )

          resolvedSpec = answers.spec as string | undefined
          if (!resolvedSpec) throw new GhmError('Usage: ghm clone <owner>/<repo>', 2)
        }

        const { root } = await readConfig({ configPath: options.config })
        await cloneRepo(resolvedSpec, { root })
      })

    cli.parse(['node', 'ghm', ...argv], { run: false })

    if (cli.args.length > 0) {
      process.stderr.write(`Unknown command: ${cli.args.join(' ')}\n`)
      return 2
    }

    await cli.runMatchedCommand()

    return 0
  } catch (error) {
    if (error instanceof GhmError) {
      process.stderr.write(`${error.message}\n`)
      return error.exitCode
    }

    process.stderr.write(`${(error as Error).message}\n`)
    return 1
  }
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    process.stderr.write(`${(error as Error).message}\n`)
    process.exitCode = 1
  })
