import path from 'node:path'

import { x } from 'tinyexec'

import { ensureToolReady } from '../utils/commands.ts'
import type { GlobalUserConfig } from '../utils/config.ts'
import { error as printError } from '../utils/error.ts'
import { withPathSelector } from '../utils/selector.ts'
import { runCompositionMainCommand } from './composition-main.ts'

const githubUrl = 'https://github.com'

export async function runOpenCommand(
  target: string | undefined,
  config: GlobalUserConfig
): Promise<void> {
  try {
    const action = (selectedPath: string) => openGitHubPath(config.root, selectedPath)

    await withPathSelector(config.root, target, action, async (mainCommand, repo) => {
      // Fork compositions retain the source path locally, so this opens the upstream page.
      const compositionTarget = await runCompositionMainCommand(mainCommand, repo, config, {})
      await action(compositionTarget.path)
    })
  } catch {
    process.exit(130)
  }
}

async function openGitHubPath(root: string, selectedPath: string): Promise<void> {
  const url = buildGitHubUrl(root, selectedPath)
  const launcher = getUrlLauncher()
  await ensureToolReady(launcher)

  let result
  try {
    result = await x(launcher, [url], { throwOnError: false })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    printError(`Failed to open ${url}: ${details}`)
  }

  if (result.exitCode !== 0) {
    const details = result.stderr.trim() || `${launcher} exited with code ${result.exitCode}`
    printError(`Failed to open ${url}: ${details}`)
  }
}

function buildGitHubUrl(root: string, selectedPath: string): string {
  const relativePath = path.relative(root, selectedPath)
  if (!relativePath) {
    return githubUrl
  }

  const segments = relativePath.split(path.sep).slice(0, 2).map(encodeURIComponent)
  return `${githubUrl}/${segments.join('/')}`
}

function getUrlLauncher(): string {
  if (process.platform === 'darwin') {
    return 'open'
  }

  if (process.platform === 'linux') {
    return 'xdg-open'
  }

  return printError(`Opening URLs is unsupported on platform "${process.platform}".`, 69)
}
