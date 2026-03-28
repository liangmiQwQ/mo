import pc from 'picocolors'
import { icons } from './format'

/**
 * Prints a warning message to stderr.
 *
 * This helper never exits the process.
 */
export function warn(message: string): void {
  console.warn(pc.yellow(`${icons.warning} ${message}`))
}

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
