import { cac } from 'cac'
import { generateShellIntegration } from './inner/shell'
import { innerBinName, preventRunning } from './utils/runner'

const cli = cac(innerBinName)

await preventRunning()

cli
  .command('shell <shell>', 'Generate shell integration code')
  .action((shell: string) => console.log(generateShellIntegration(shell)))

cli.parse()
