import { cac } from 'cac'
import { generateShellIntegration } from './inner/shell'
import { innerBinName, preventRunning } from './utils/runner'

const cli = cac(innerBinName)

await preventRunning()

cli
  .command('shell <shell>', 'Generate shell integration code')
  .action((shell: string) => console.log(generateShellIntegration(shell)))

cli.command('cd', 'Print pending directory path from shell state').action(() => {
  const pending = process.env.GHM_CD_TARGET
  if (typeof pending !== 'string' || !pending.trim()) {
    console.log('.')
    return
  }

  console.log(pending)
})

cli.parse()
