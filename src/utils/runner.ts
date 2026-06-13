import { existsSync } from 'node:fs'
import { ensureToolReady } from './commands'
import { error } from './error'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const userBinName = resolveUserBinName()
export const innerBinName = `${userBinName}-inner`

export async function preventRunning() {
  if (process.platform === 'win32') {
    error('Windows is not supported. mo currently supports macOS and Linux only.', 69)
  }

  try {
    const hasInner = await ensureToolReady(innerBinName, false)
    const hasUser = await ensureToolReady(userBinName, false)

    if (!hasInner || !hasUser) {
      throw new Error() // Trigger catch block
    }
  } catch {
    error('Local installation is not supported. Please install mo globally.', 78)
  }
}

export function getRestartFlagPath() {
  return path.join(tmpdir(), `${userBinName}-restart-flag`)
}

export function getCdTargetPath() {
  return path.join(tmpdir(), `${userBinName}-cd-target`)
}

export function checkRestartRequired(): void {
  const flagPath = getRestartFlagPath()
  if (existsSync(flagPath)) {
    error('Please restart your shell to apply the recent setup changes.')
  }
}

function resolveUserBinName(): string {
  const fallback = 'mo'
  const binPath = process.argv[1]
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
