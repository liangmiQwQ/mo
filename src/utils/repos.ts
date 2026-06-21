import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { x } from 'tinyexec'

export interface RepoEntry {
  owner: string
  name: string
  path: string
}

export interface RepoGroup {
  owner: string
  path: string
  repos: RepoEntry[]
}

function readDirectoryNames(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .toSorted()
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
      nodeOptions: { cwd: dir }
    })
    return result.stdout.includes('github.com')
  } catch {
    return false
  }
}

export async function scanRepos(root: string): Promise<RepoGroup[]> {
  const owners = readDirectoryNames(root)
  const groups = await Promise.all(owners.map(owner => scanOwner(root, owner)))
  return groups.filter(group => group !== null)
}

async function scanOwner(root: string, owner: string): Promise<RepoGroup | null> {
  const ownerPath = path.join(root, owner)
  const repos = await Promise.all(
    readDirectoryNames(ownerPath).map(async repo => {
      const repoPath = path.join(ownerPath, repo)
      return isGitRepo(repoPath) && (await hasGitHubRemote(repoPath))
        ? { owner, name: repo, path: repoPath }
        : null
    })
  )
  const matchedRepos = repos.filter(repo => repo !== null)
  return matchedRepos.length > 0 ? { owner, path: ownerPath, repos: matchedRepos } : null
}
