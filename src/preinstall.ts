import { error } from './output/error'
import { isGlobalRun, isWindows, shouldRunHooks } from './utils/hooks'

export function runPreinstallChecks(): void {
  if (isWindows) {
    error('Windows is not supported. ghm currently supports macOS and Linux only.', 69)
  }

  if (!isGlobalRun()) {
    error('Local installation is not supported. Please install ghm globally.', 78)
  }
}

if (shouldRunHooks()) {
  runPreinstallChecks()
}
