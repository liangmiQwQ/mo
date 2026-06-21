import { writeFileSync } from 'node:fs'

import type { GlobalUserConfig } from '../utils/config.ts'
import { getCdTargetPath } from '../utils/runner.ts'
import { withPathSelector } from '../utils/selector.ts'

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  try {
    await withPathSelector(config.root, target, nextPath => {
      writeFileSync(getCdTargetPath(), nextPath, 'utf8')
    })
  } catch {
    // Canceled by user - exit silently
    process.exit(130)
  }
}
