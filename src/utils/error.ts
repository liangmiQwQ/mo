import pc from 'picocolors'
import { icons } from './format'

/**
 * Prints an error message to stderr and exits the process.
 *
 * - Uses an ERROR prefix with background color and X icon
 * - Returns `never` because it calls `process.exit()`.
 */
export function error(message: string, exitCode: number = 1): never {
  console.error(pc.red(`${icons.error} ${message}`))
  process.exit(exitCode)
}
