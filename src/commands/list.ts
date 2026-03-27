import { readdirSync } from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'

import type { GlobalUserConfig } from '../config/config'

export function runListCommand(config: GlobalUserConfig): void {
  const owners = readDirectoryNames(config.root)
  const repos: string[] = []

  for (const owner of owners) {
    const ownerPath = path.join(config.root, owner)
    const ownerRepos = readDirectoryNames(ownerPath)

    for (const repo of ownerRepos) {
      repos.push(`${owner}/${repo}`)
    }
  }

  if (!repos.length) {
    console.log(pc.yellow(`No repositories found under ${config.root}`))
    return
  }

  for (const repo of repos.sort()) {
    console.log(repo)
  }
}

function readDirectoryNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}
