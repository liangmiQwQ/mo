import pc from 'picocolors'

import { icons } from './format.ts'

/**
 * Prints an error message to stderr and exits the process.
 *
 * - Uses an ERROR prefix with background color and X icon
 * - Returns `never` because it calls `process.exit()`.
 */
export function error(message: string, exitCode = 1): never {
  console.error(pc.bold(pc.red(`${icons.error} ${message}`)))
  process.exit(exitCode)
}
