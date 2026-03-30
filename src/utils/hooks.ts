import { error } from './error'
import which from 'which'
import { bin } from '../../package.json'

export async function preventRunning() {
  if (process.platform === 'win32') {
    error('Windows is not supported. ghm currently supports macOS and Linux only.', 69)
  }

  if ((await which(Object.keys(bin)[0], { nothrow: true })) === null) {
    error('Local installation is not supported. Please install ghm globally.', 78)
  }
}
