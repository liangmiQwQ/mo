import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import { createApp } from '@vue-tui/runtime'
import pc from 'picocolors'

import Selector from '../components/Selector.vue'
import { startSpinner, stopSpinner, icons, toTildePath } from './format.ts'
import { scanRepos } from './repos.ts'
import type { RepoGroup } from './repos.ts'
import { searchOwnerGroupsByName, searchReposByName } from './search.ts'

export async function withPathSelector<T>(
  root: string,
  target: string | undefined,
  action: (targetPath: string) => T | Promise<T>
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
        `${icons.error} ${pc.red(`No matching directory found for '${resolvedTarget}'`)}`
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
    const app = createApp(Selector, {
      root,
      groups,
      onSelect: (selectedPath: string) => {
        setTimeout(() => {
          app.unmount()
          resolve(action(selectedPath))
        }, 50)
      },
      onCancel: () => {
        setTimeout(() => {
          app.unmount()
          reject(new Error('Canceled.'))
        }, 50)
      }
    })

    app.mount({ exitOnCtrlC: false })
  })
}

function resolveTarget(root: string, target: string, groups: RepoGroup[]): string | null {
  if (target === '.') {
    return root
  }

  // Try as explicit owner/repo path relative to root
  const segments = target.split('/').filter(Boolean)
  if (segments.length === 2) {
    const candidate = path.join(root, ...segments)
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate
    }
  }

  // Search by best match score: repos first, then owners.
  // This ensures a repo named "foo" is preferred over an owner directory named "foo".
  const repoMatches = searchReposByName(target, groups)
  if (repoMatches.length > 0) {
    return repoMatches[0].repo.path
  }

  const ownerMatches = searchOwnerGroupsByName(target, groups)
  if (ownerMatches.length > 0) {
    return ownerMatches[0].path
  }

  return null
}
