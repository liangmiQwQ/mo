import { readdirSync } from 'node:fs'
import path from 'node:path'
import type { GlobalUserConfig } from '../utils/config'
import { error } from '../utils/error'
import { promptAutocomplete } from '../utils/prompt'

type LocationOption = {
  label: string
  path: string
}

export async function runCdCommand(
  target: string | undefined,
  config: GlobalUserConfig,
): Promise<void> {
  const resolvedTarget = target?.trim()
  const nextPath = resolvedTarget
    ? resolvePathFromTarget(resolvedTarget, config.root)
    : await promptLocationPath(config.root)

  process.stdout.write(`${nextPath}\n`)
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

async function promptLocationPath(root: string): Promise<string> {
  const options = collectLocationOptions(root)

  const selected = await promptAutocomplete(
    'Where would you like to go?',
    'path',
    options.map((option) => ({
      title: option.label,
      value: option.path,
    })),
    'cd canceled.',
  )

  if (typeof selected !== 'string' || !selected) {
    error('No target selected.', 78)
  }

  return selected
}

function collectLocationOptions(root: string): LocationOption[] {
  const options: LocationOption[] = [{ label: 'root', path: root }]
  const owners = readDirectoryNames(root)

  for (const owner of owners) {
    const ownerPath = path.join(root, owner)
    options.push({
      label: owner,
      path: ownerPath,
    })

    const repos = readDirectoryNames(ownerPath)
    for (const repo of repos) {
      options.push({
        label: `${owner}/${repo}`,
        path: path.join(ownerPath, repo),
      })
    }
  }

  return options
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
