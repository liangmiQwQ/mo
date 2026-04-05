import React from 'react'
import { render } from 'ink'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { Selector } from '../components/selector'
import { scanRepos, type RepoGroup } from './repos'
import pc from 'picocolors'
import { startSpinner, stopSpinner, icons, toTildePath } from './format'

export async function withPathSelector<T>(
  root: string,
  target: string | undefined,
  action: (targetPath: string) => T | Promise<T>,
): Promise<T> {
  const resolvedTarget = target?.trim()

  if (resolvedTarget) {
    let groups: RepoGroup[] = []
    if (resolvedTarget !== '.') {
      const spinner = startSpinner('Scanning repositories...')
      groups = await scanRepos(root)
      stopSpinner(spinner)
    }

    const resolved = resolveTarget(root, resolvedTarget, groups)
    if (!resolved) {
      console.error(
        `${icons.error} ${pc.red(`No matching directory found for '${resolvedTarget}'`)}`,
      )
      throw new Error(`No match: ${resolvedTarget}`)
    }
    console.log(`${icons.success} ${pc.cyan(toTildePath(resolved))}`)
    return action(resolved)
  }

  const spinner = startSpinner('Scanning repositories...')
  const groups = await scanRepos(root)
  stopSpinner(spinner)

  return new Promise<T>((resolve, reject) => {
    const { unmount } = render(
      React.createElement(Selector, {
        root,
        groups,
        onSelect: (selectedPath: string) => {
          setTimeout(() => {
            unmount()
            resolve(action(selectedPath))
          }, 50)
        },
        onCancel: () => {
          setTimeout(() => {
            unmount()
            reject(new Error('Canceled.'))
          }, 50)
        },
      }),
      { exitOnCtrlC: false },
    )
  })
}

function resolveTarget(root: string, target: string, groups: RepoGroup[]): string | null {
  if (target === '.') return root

  // Try as owner or owner/repo path relative to root (max depth 2)
  const segments = target.split('/').filter(Boolean)
  if (segments.length >= 1 && segments.length <= 2) {
    const candidate = path.join(root, ...segments)
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate
    }
  }

  // Search by name: repos first, then owners
  const q = target.toLowerCase()
  for (const group of groups) {
    for (const repo of group.repos) {
      if (repo.name.toLowerCase().includes(q)) return repo.path
    }
  }
  for (const group of groups) {
    if (group.owner.toLowerCase().includes(q)) return group.path
  }

  return null
}
