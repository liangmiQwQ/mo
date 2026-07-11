import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { x } from 'tinyexec'

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
  const owners = await readDirectoryNames(root)
  const groups: RepoGroup[] = []

  for (const owner of owners) {
    const ownerPath = path.join(root, owner)
    const potentialRepos = await readDirectoryNames(ownerPath)
    const repos: RepoEntry[] = []

    for (const repo of potentialRepos) {
      const repoPath = path.join(ownerPath, repo)
      if ((await isGitRepo(repoPath)) && (await hasGitHubRemote(repoPath))) {
        repos.push({ owner, name: repo, path: repoPath })
      }
    }

    if (repos.length > 0) {
      groups.push({ owner, path: ownerPath, repos })
    }
  }

  return groups
}
