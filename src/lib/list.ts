import fs from 'node:fs/promises'
import path from 'node:path'

async function listSubDirs(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name)
}

export async function listRepos(root: string): Promise<string[]> {
  const owners = await listSubDirs(root)
  const repos: string[] = []

  for (const owner of owners) {
    const ownerDir = path.join(root, owner)
    const ownerRepos = await listSubDirs(ownerDir)
    for (const repo of ownerRepos) repos.push(`${owner}/${repo}`)
  }

  repos.sort((a, b) => a.localeCompare(b))
  return repos
}
