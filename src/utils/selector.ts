import path from 'node:path'
import { readdirSync } from 'node:fs'
import { error } from './error'
import { collectOwnerGroups, promptLocationPath } from './location-prompt'

export type LocationOption = {
  label: string
  path: string
}

export async function withPathSelector<T>(
  root: string,
  target: string | undefined,
  action: (targetPath: string) => T | Promise<T>,
): Promise<T> {
  const resolvedTarget = target?.trim()
  const nextPath = resolvedTarget
    ? resolvePathFromTarget(resolvedTarget, root)
    : await promptLocationPath(root)

  return action(nextPath)
}

function resolvePathFromTarget(target: string, root: string): string {
  if (target === '.' || target === 'root') {
    return root
  }

  const segments = target.split('/').filter(Boolean)
  if (segments.length === 1) {
    return resolveOwnerPath(root, segments[0])
  }

  if (segments.length === 2) {
    return resolveRepoPath(root, segments[0], segments[1])
  }

  error('Invalid target. Use "root", "<owner>", or "<owner>/<repo>".', 78)
}

function resolveOwnerPath(root: string, owner: string): string {
  const ownerPath = path.join(root, owner)
  if (!readDirectoryNames(root).includes(owner)) {
    error(`Owner "${owner}" not found under configured root.`, 78)
  }
  return ownerPath
}

function resolveRepoPath(root: string, owner: string, repo: string): string {
  const ownerPath = resolveOwnerPath(root, owner)
  const repoPath = path.join(ownerPath, repo)

  if (!readDirectoryNames(ownerPath).includes(repo)) {
    error(`Repository "${owner}/${repo}" not found under configured root.`, 78)
  }

  return repoPath
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

export { collectOwnerGroups }
