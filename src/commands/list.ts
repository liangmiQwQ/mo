import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { x } from 'tinyexec'
import pc from 'picocolors'
import type { GlobalUserConfig } from '../utils/config'
import { icons, highlight, muted, toTildePath, bold, gray } from '../utils/format'

export async function runListCommand(config: GlobalUserConfig): Promise<void> {
  const owners = readDirectoryNames(config.root)

  if (!owners.length) {
    printNoRepositoriesFound(config.root)
    return
  }

  const ownerRepos = new Map<string, string[]>()
  let totalRepos = 0

  for (const owner of owners) {
    const ownerPath = path.join(config.root, owner)
    const potentialRepos = readDirectoryNames(ownerPath)
    const validRepos: string[] = []

    for (const repo of potentialRepos) {
      const repoPath = path.join(ownerPath, repo)
      if (isGitRepo(repoPath) && (await hasGitHubRemote(repoPath))) {
        validRepos.push(repo)
      }
    }

    if (validRepos.length) {
      ownerRepos.set(owner, validRepos)
      totalRepos += validRepos.length
    }
  }

  if (!totalRepos) {
    printNoRepositoriesFound(config.root)
    return
  }

  const displayRoot = toTildePath(config.root)
  console.log(`${gray(`Projects in`)} ${highlight(displayRoot)}`)
  console.log()

  const ownerEntries = Array.from(ownerEntriesSorted(ownerRepos))

  for (const [owner, repos] of ownerEntries) {
    console.log(`${bold(owner)} ${muted(`(${repos.length})`)}`)

    for (const repo of repos) {
      console.log(`${muted(` - `)}${repo}`)
    }

    console.log()
  }

  const totalOwners = ownerRepos.size
  console.log(
    `${muted('Found')} ${highlight(totalRepos.toString())} ${muted(`repositor${totalRepos === 1 ? 'y' : 'ies'} in`)} ${highlight(totalOwners.toString())} ${muted(`organization${totalOwners === 1 ? '' : 's'}`)}`,
  )
}

function printNoRepositoriesFound(root: string): void {
  console.log(`${icons.warning} ${pc.yellow(`No repositories found under ${highlight(root)}`)}`)
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

async function hasGitHubRemote(dir: string): Promise<boolean> {
  try {
    const result = await x('git', ['remote', '-v'], {
      throwOnError: false,
      nodeOptions: { cwd: dir },
    })
    // Check if any remote URL contains github.com
    return result.stdout.includes('github.com')
  } catch {
    return false
  }
}
