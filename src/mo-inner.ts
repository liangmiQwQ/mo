import { cac } from 'cac'

import { clearShellActions, generateShellActions } from './inner/actions.ts'
import { generateShellIntegration } from './inner/shell.ts'
import { innerBinName } from './utils/runner.ts'

const cli = cac(innerBinName)

cli.command('shell <shell>', 'Generate shell integration code').action((shell: string) => {
  console.log(generateShellIntegration(shell))
})

cli.command('actions <shell>', 'Print pending shell actions').action((shell: string) => {
  console.log(generateShellActions(shell))
})

cli.command('actions-clear', 'Clear pending shell actions').action(() => {
  clearShellActions()
})

cli.parse()
