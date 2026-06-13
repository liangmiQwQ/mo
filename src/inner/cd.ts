import { existsSync, readFileSync, rmSync } from 'node:fs'
import { getCdTargetPath } from '../utils/runner'

export function getCdPath(): string {
  const targetFile = getCdTargetPath()
  if (!existsSync(targetFile)) {
    return '.'
  }

  const pending = readFileSync(targetFile, 'utf8').trim()
  rmSync(targetFile)

  if (!pending) {
    return '.'
  }

  return pending
}
