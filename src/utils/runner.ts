import { tmpdir } from 'node:os'
import path from 'node:path'

import { ensureToolReady } from './commands.ts'
import { error } from './error.ts'

export const userBinName = resolveUserBinName()
export const innerBinName = `${userBinName}-inner`
export const shellIntegrationEnvName = 'MO_SHELL_INTEGRATION'

export async function preventRunning() {
  if (process.platform === 'win32') {
    error('Windows is not supported. mo currently supports macOS and Linux only.', 69)
  }

  try {
    const hasInner = await ensureToolReady(innerBinName, false)
    const hasUser = await ensureToolReady(userBinName, false)

    if (!hasInner || !hasUser) {
      throw new Error('Required global commands are unavailable.')
    }
  } catch {
    error('Local installation is not supported. Please install mo globally.', 78)
  }
}

export function getShellActionsPath() {
  return path.join(tmpdir(), `${userBinName}-shell-actions`)
}

function resolveUserBinName(): string {
  const fallback = 'mo'
  const [, binPath] = process.argv
  if (!binPath) {
    return fallback
  }

  const binName = path.basename(binPath).replace(/\.mjs$/, '')
  if (binName.endsWith('-inner')) {
    return binName.slice(0, -'-inner'.length) || fallback
  }
  if (binName.endsWith('-get-root')) {
    return binName.slice(0, -'-get-root'.length) || fallback
  }

  return binName || fallback
}
