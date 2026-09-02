import pc from 'picocolors'

import { appendCdAction } from '../inner/actions.ts'
import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { icons, toTildePath } from '../utils/format.ts'
import { resolveCurrentRepo } from '../utils/repos.ts'
import { withPathSelector } from '../utils/selector.ts'
import { runCompositionMainCommand } from './composition-main.ts'

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  if (target?.trim() === '.') {
    const repoPath = await resolveCurrentRepo(config.root, process.cwd())
    if (!repoPath) {
      error(
        `Current directory is not inside a mo-managed repository under ${toTildePath(config.root)}.`
      )
    }

    console.log(`${icons.success} ${pc.cyan(toTildePath(repoPath))}`)
    await appendCdAction(repoPath)
    return
  }

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
