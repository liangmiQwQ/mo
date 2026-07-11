import { installShellrc } from 'free-shellrc'

import type { SupportedShell } from './config.ts'
import { innerBinName } from './runner.ts'

export async function syncShellrc(shells: SupportedShell[]) {
  await installShellrc(shell => {
    if (shell === 'fish') {
      return `${innerBinName} shell fish | source`
    }
    return `source <(${innerBinName} shell ${shell})`
  }, shells)
}
