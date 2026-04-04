import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { x } from 'tinyexec'

export type RepoEntry = {
  owner: string
  name: string
  path: string
}

export type RepoGroup = {
  owner: string
  path: string
  repos: RepoEntry[]
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
  return existsSync(path.join(dir, '.git'))
}

async function hasGitHubRemote(dir: string): Promise<boolean> {
  try {
    const result = await x('git', ['remote', '-v'], {
      throwOnError: false,
      nodeOptions: { cwd: dir },
    })
    return result.stdout.includes('github.com')
  } catch {
    return false
  }
}

export async function scanRepos(root: string): Promise<RepoGroup[]> {
  const owners = readDirectoryNames(root)
  const groups: RepoGroup[] = []

  for (const owner of owners) {
    const ownerPath = path.join(root, owner)
    const potentialRepos = readDirectoryNames(ownerPath)
    const repos: RepoEntry[] = []

    for (const repo of potentialRepos) {
      const repoPath = path.join(ownerPath, repo)
      if (isGitRepo(repoPath) && (await hasGitHubRemote(repoPath))) {
        repos.push({ owner, name: repo, path: repoPath })
      }
    }

    if (repos.length) {
      groups.push({ owner, path: ownerPath, repos })
    }
  }

  return groups
}
