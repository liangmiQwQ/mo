import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import pc from 'picocolors'

import type { GlobalUserConfig } from '../config/config'
import { error } from '../output/error'

export function runCloneCommand(repo: string, config: GlobalUserConfig): void {
  const parsedRepo = parseRepo(repo)
  const ownerDir = path.join(config.root, parsedRepo.owner)
  const targetDir = path.join(ownerDir, parsedRepo.name)

  if (existsSync(targetDir)) {
    error(`Repository already exists at ${targetDir}`)
  }

  mkdirSync(ownerDir, { recursive: true })

  const cloneUrl = `https://github.com/${parsedRepo.owner}/${parsedRepo.name}.git`
  const result = spawnSync('git', ['clone', cloneUrl, targetDir], {
    encoding: 'utf8',
    env: process.env,
    shell: true,
  })

  if (result.error) {
    error(`Failed to run git clone: ${result.error.message}`)
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    if (result.stderr) {
      process.stderr.write(result.stderr)
    }

    error(`Git clone failed for ${parsedRepo.owner}/${parsedRepo.name}`, result.status)
  }

  console.log(pc.green(`Cloned ${parsedRepo.owner}/${parsedRepo.name} to ${targetDir}`))
}

function parseRepo(repo: string): { owner: string; name: string } {
  const match = repo.match(/^([^/]+)\/([^/]+)$/)

  if (!match) {
    error('Invalid repository format. Use <owner>/<repo>.')
  }

  return {
    owner: match[1],
    name: match[2],
  }
}
