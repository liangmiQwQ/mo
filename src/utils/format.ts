import pc from 'picocolors'
import os from 'node:os'

export function toTildePath(fullPath: string): string {
  const home = os.homedir()
  if (fullPath.startsWith(home)) {
    return '~' + fullPath.slice(home.length)
  }
  return fullPath
}

export const icons = {
  success: pc.green('✓'),
  error: pc.red('✗'),
  warning: pc.yellow('⚠'),
}

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export interface Spinner {
  interval: NodeJS.Timeout
  message: string
}

export function startSpinner(message: string): Spinner {
  let frameIndex = 0
  const interval = setInterval(() => {
    const frame = pc.cyan(spinnerFrames[frameIndex])
    process.stdout.write(`\r${frame} ${message}`)
    frameIndex = (frameIndex + 1) % spinnerFrames.length
  }, 80)

  return { interval, message }
}

export function stopSpinner(spinner: Spinner): void {
  clearInterval(spinner.interval)
  process.stdout.write('\r' + ' '.repeat(spinner.message.length + 2) + '\r')
}

export function success(message: string): void {
  console.log(`${icons.success} ${pc.green(message)}`)
}

export function bold(message: string): string {
  return pc.bold(message)
}

export function highlight(path: string): string {
  return pc.cyan(path)
}

export function muted(text: string): string {
  return pc.dim(text)
}

export function gray(text: string): string {
  return pc.gray(text)
}
