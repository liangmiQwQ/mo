import { appendCdAction } from '../inner/actions.ts'
import type { GlobalUserConfig } from '../utils/config.ts'
import { withPathSelector } from '../utils/selector.ts'

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  try {
    await withPathSelector(config.root, target, nextPath => {
      appendCdAction(nextPath)
    })
  } catch {
    // Canceled by user - exit silently
    process.exit(130)
  }
}
