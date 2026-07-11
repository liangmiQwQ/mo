import { cac } from 'cac'

import { clearShellActions, generateShellActions } from './inner/actions.ts'
import { generateShellIntegration } from './inner/shell.ts'
import { innerBinName } from './utils/runner.ts'

const cli = cac(innerBinName)

cli.command('shell <shell>', 'Generate shell integration code').action(async (shell: string) => {
  console.log(await generateShellIntegration(shell))
})

cli.command('actions <shell>', 'Print pending shell actions').action(async (shell: string) => {
  console.log(await generateShellActions(shell))
})

cli.command('actions-clear', 'Clear pending shell actions').action(async () => {
  await clearShellActions()
})

cli.parse()
