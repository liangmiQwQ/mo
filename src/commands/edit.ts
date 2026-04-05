import { spawnSync } from 'node:child_process'
import type { GlobalUserConfig } from '../utils/config'
import { withPathSelector } from '../utils/selector'
import { error } from '../utils/error'

export async function runEditCommand(
  target: string | undefined,
  config: GlobalUserConfig,
  options: { editor?: string } = {},
): Promise<void> {
  const editorCommand = options.editor ?? config.editor
  if (!editorCommand) {
    error('No editor configured. Set "editor" in config via `mo setup` or use `-e <editor>`.', 78)
  }

  try {
    await withPathSelector(config.root, target, (selectedPath) => {
      spawnSync(editorCommand, [selectedPath], { stdio: 'inherit' })
    })
  } catch {
    process.exit(130)
  }
}

export async function runOpenCommand(
  target: string | undefined,
  config: GlobalUserConfig,
): Promise<void> {
  return runEditCommand(target, config, { editor: 'open' })
}
