import { writeFileSync } from 'node:fs'
import type { GlobalUserConfig } from '../utils/config'
import { getCdTargetPath } from '../utils/runner'
import { withPathSelector } from '../utils/selector'

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig,
): Promise<void> {
  try {
    await withPathSelector(config.root, target, (nextPath) => {
      writeFileSync(getCdTargetPath(), nextPath, 'utf8')
    })
  } catch {
    // Canceled by user - exit silently
    process.exit(130)
  }
}
