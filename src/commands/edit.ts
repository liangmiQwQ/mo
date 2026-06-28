import { spawnSync } from 'node:child_process'

import { appendEditAction, buildDirectEditorEnv, hasShellIntegration } from '../inner/actions.ts'
import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { withPathSelector } from '../utils/selector.ts'

export async function runEditCommand(
  target: string | undefined,
  config: GlobalUserConfig,
  options: { editor?: string } = {}
): Promise<void> {
  const editorCommand = options.editor ?? config.editor
  if (!editorCommand) {
    error('No editor configured. Set "editor" in config via `mo setup` or use `-e <editor>`.', 78)
  }

  try {
    await withPathSelector(config.root, target, selectedPath => {
      if (hasShellIntegration()) {
        appendEditAction(editorCommand, selectedPath)
        return
      }

      spawnSync(editorCommand, [selectedPath], { env: buildDirectEditorEnv(), stdio: 'inherit' })
    })
  } catch {
    process.exit(130)
  }
}

export async function runOpenCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  return runEditCommand(target, config, { editor: 'open' })
}
