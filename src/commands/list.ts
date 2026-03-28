import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import pc from 'picocolors'
import type { GlobalUserConfig } from '../config/config'
import { icons, highlight, muted, toTildePath, bold, gray } from '../output/format'

export function runListCommand(config: GlobalUserConfig): void {
  const owners = readDirectoryNames(config.root)

  if (!owners.length) {
    console.log(
      `${icons.warning} ${pc.yellow(`No repositories found under ${highlight(config.root)}`)}`,
    )
    return
  }

  const allRepos: string[] = []
  const ownerRepos = new Map<string, string[]>()

  for (const owner of owners) {
    const ownerPath = path.join(config.root, owner)
    const potentialRepos = readDirectoryNames(ownerPath)
    const validRepos: string[] = []

    for (const repo of potentialRepos) {
      const repoPath = path.join(ownerPath, repo)
      if (isGitRepo(repoPath) && hasGitHubRemote(repoPath)) {
        validRepos.push(repo)
      }
    }

    if (validRepos.length) {
      ownerRepos.set(owner, validRepos)
      validRepos.forEach((repo) => allRepos.push(`${owner}/${repo}`))
    }
  }

  if (!allRepos.length) {
    console.log(
      `${icons.warning} ${pc.yellow(`No repositories found under ${highlight(config.root)}`)}`,
    )
    return
  }

  const displayRoot = toTildePath(config.root)
  console.log(`${gray(`Projects in`)} ${highlight(displayRoot)}`)
  console.log()

  const ownerEntries = Array.from(ownerEntriesSorted(ownerRepos))

  for (const [owner, repos] of ownerEntries) {
    console.log(bold(owner))

    for (const repo of repos) {
      console.log(`${muted(` - `)}${repo}`)
    }

    console.log()
  }

  const totalRepos = allRepos.length
  const totalOwners = ownerRepos.size
  console.log(
    `${muted('Found')} ${highlight(totalRepos.toString())} ${muted(`repositor${totalRepos === 1 ? 'y' : 'ies'} in`)} ${highlight(totalOwners.toString())} ${muted(`organization${totalOwners === 1 ? '' : 's'}`)}`,
  )
}

function* ownerEntriesSorted(map: Map<string, string[]>): Generator<[string, string[]]> {
  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  for (const entry of sorted) {
    yield [entry[0], entry[1].sort()]
  }
}

function readDirectoryNames(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}

function isGitRepo(dir: string): boolean {
  const gitDir = path.join(dir, '.git')
  return existsSync(gitDir)
}

function hasGitHubRemote(dir: string): boolean {
  try {
    const output = execSync('git remote -v', {
      cwd: dir,
      encoding: 'utf8',
      timeout: 5000,
    })
    // Check if any remote URL contains github.com
    return output.includes('github.com')
  } catch {
    return false
  }
}
