import { x } from 'tinyexec'
import which from 'which'

import { error } from './error.ts'

export const runCommand = async (
  command: string,
  args: string[]
): Promise<{ exitCode: number }> => {
  const result = await x(command, args, { throwOnError: false })
  return { exitCode: result.exitCode ?? 1 }
}

export const ensureToolReady = async (command: string, panic = true): Promise<boolean> => {
  try {
    const resolved = await which(command, { nothrow: true })
    if (resolved) {
      return true
    }
  } catch {
    // Fall through to standardized error
  }

  if (panic) {
    error(`Required tool "${command}" is unavailable.`, 69)
  }

  return false
}
