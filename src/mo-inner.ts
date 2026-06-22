import { cac } from 'cac'

import { getCdPath } from './inner/cd.ts'
import { generateShellIntegration } from './inner/shell.ts'
import { innerBinName } from './utils/runner.ts'

const cli = cac(innerBinName)

cli.command('shell <shell>', 'Generate shell integration code').action((shell: string) => {
  console.log(generateShellIntegration(shell))
})

cli.command('cd', 'Print pending directory path from shell state').action(() => {
  console.log(getCdPath())
})

cli.parse()
