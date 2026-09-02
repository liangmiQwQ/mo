import { appendCdAction } from '../inner/actions.ts'
import type { GlobalUserConfig } from '../utils/config.ts'
import { withPathSelector } from '../utils/selector.ts'
import { runCompositionMainCommand } from './composition-main.ts'

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  try {
    await withPathSelector(config.root, target, appendCdAction, async (mainCommand, repo) => {
      const compositionTarget = await runCompositionMainCommand(mainCommand, repo, config, {})
      await appendCdAction(compositionTarget.path)
    })
  } catch {
    // Canceled by user - exit silently
    process.exit(130)
  }
}
