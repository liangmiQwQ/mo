import { spawn } from 'node:child_process'
import { once } from 'node:events'

import { appendEditAction, buildDirectEditorEnv, hasShellIntegration } from '../inner/actions.ts'
import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { withPathSelector } from '../utils/selector.ts'
import { runCompositionMainCommand } from './composition-main.ts'

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
    const action = async (selectedPath: string): Promise<void> => {
      if (hasShellIntegration()) {
        await appendEditAction(editorCommand, selectedPath)
        return
      }

      await runEditor(editorCommand, selectedPath)
    }

    await withPathSelector(config.root, target, action, async (mainCommand, repo) => {
      const compositionTarget = await runCompositionMainCommand(mainCommand, repo, config, {})
      await action(compositionTarget.path)
    })
  } catch {
    process.exit(130)
  }
}

async function runEditor(editorCommand: string, selectedPath: string): Promise<void> {
  const child = spawn(editorCommand, [selectedPath], {
    env: buildDirectEditorEnv(),
    stdio: 'inherit'
  })
  const [code] = await once(child, 'exit')
  if (code !== 0) {
    throw new Error(`Exit code ${code}`)
  }
}

export async function runOpenCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  return runEditCommand(target, config, { editor: 'open' })
}
