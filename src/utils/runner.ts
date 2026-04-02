import { ensureToolReady } from './commands'
import { error } from './error'

export const userBinName = 'mo'
export const innerBinName = 'mo-inner'

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
