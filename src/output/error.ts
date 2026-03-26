import pc from 'picocolors'

/**
 * Prints a warning message to stderr.
 *
 * This helper never exits the process.
 */
export function warn(message: string): void {
  console.warn(`${pc.bgYellow(pc.black(' WARN '))} ${pc.yellow(message)}`)
}

/**
 * Prints an error message to stderr and exits the process.
 *
 * - Uses an `ERROR` prefix with background color
 * - Returns `never` because it calls `process.exit()`.
 */
export function error(message: string, exitCode: number = 1): never {
  console.error(`${pc.white(pc.bgRed(' ERROR '))} ${pc.red(message)}`)
  process.exit(exitCode)
}
