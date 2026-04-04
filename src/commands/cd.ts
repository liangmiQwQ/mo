import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import type { GlobalUserConfig } from '../utils/config'
import { withPathSelector } from '../utils/selector'

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig,
): Promise<void> {
  try {
    await withPathSelector(config.root, target, (nextPath) => {
      const targetFile = path.join(tmpdir(), 'mo-cd-target')
      writeFileSync(targetFile, nextPath, 'utf8')
    })
  } catch {
    // Canceled by user - exit silently
    process.exit(130)
  }
}
