import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { pathExists } from './fs.ts'

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

export async function resolveCurrentRepo(root: string, cwd: string): Promise<string | null> {
  const relative = path.relative(root, cwd)
  const parts = relative.split(path.sep).filter(Boolean)

  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    return null
  }

  if (path.isAbsolute(relative) || parts.length < 2) {
    return null
  }

  const repoPath = path.join(root, parts[0], parts[1])
  return (await isGitRepo(repoPath)) ? repoPath : null
}

async function readDirectoryNames(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .toSorted()
  } catch {
    return []
  }
}

async function isGitRepo(dir: string): Promise<boolean> {
  return pathExists(path.join(dir, '.git'))
}

export async function scanRepos(root: string): Promise<RepoGroup[]> {
  const owners = await readDirectoryNames(root)
  const groups: RepoGroup[] = []

  for (const owner of owners) {
    const ownerPath = path.join(root, owner)
    const potentialRepos = await readDirectoryNames(ownerPath)
    const repos: RepoEntry[] = []

    for (const repo of potentialRepos) {
      const repoPath = path.join(ownerPath, repo)
      if (await isGitRepo(repoPath)) {
        repos.push({ owner, name: repo, path: repoPath })
      }
    }

    if (repos.length > 0) {
      groups.push({ owner, path: ownerPath, repos })
    }
  }

  return groups
}
