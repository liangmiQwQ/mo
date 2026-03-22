import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { GhmError } from './error.js'
import { parseRepoSpec } from './repo-spec.js'

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.stat(targetPath)
    return true
  } catch {
    return false
  }
}

export async function cloneRepo(spec: string, options: { root: string }): Promise<void> {
  const { owner, repo } = parseRepoSpec(spec)

  const ownerDir = path.join(options.root, owner)
  const repoDir = path.join(ownerDir, repo)

  if (await pathExists(repoDir)) throw new GhmError(`Target already exists: ${repoDir}`, 2)

  await fs.mkdir(ownerDir, { recursive: true })

  const url = `https://github.com/${owner}/${repo}.git`
  const result = spawnSync('git', ['clone', url, repoDir], { stdio: 'inherit' })

  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new GhmError('git not found in PATH', 127)
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new GhmError(`git clone failed (exit ${result.status})`, result.status)
  }
}
