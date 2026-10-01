import { stat } from 'node:fs/promises'
import path from 'node:path'

import { createApp } from '@vue-tui/runtime'
import pc from 'picocolors'

import Selector from '../components/selector.vue'
import { error } from './error.ts'
import { startSpinner, stopSpinner, icons, toTildePath } from './format.ts'
import { pathExists } from './fs.ts'
import { parseGitHubRepoInput, resolveGitHubRepo } from './github.ts'
import type { GitHubRepo } from './github.ts'
import { resolveCurrentRepo, scanRepos } from './repos.ts'
import type { RepoGroup } from './repos.ts'
import { searchOwnerGroupsByName, searchReposByName } from './search.ts'

export type SelectorCompositionCommand = 'clone' | 'fork'

export async function withPathSelector<T>(
  root: string,
  target: string | undefined,
  action: (targetPath: string) => T | Promise<T>,
  compositionAction: (command: SelectorCompositionCommand, repo: string) => T | Promise<T>
): Promise<T> {
  const resolvedTarget = target?.trim()

  if (resolvedTarget) {
    if (resolvedTarget === '.') {
      const currentRepo = await resolveCurrentRepo(root, process.cwd())
      if (!currentRepo) {
        error(`Current directory is not inside a mo-managed repository under ${toTildePath(root)}.`)
      }

      console.log(`${icons.success} ${pc.cyan(toTildePath(currentRepo))}`)
      return action(currentRepo)
    }

    const explicitTarget = await resolveRepoPath(root, parseGitHubRepoInput(resolvedTarget))
    if (explicitTarget) {
      console.log(`${icons.success} ${pc.cyan(toTildePath(explicitTarget))}`)
      return action(explicitTarget)
    }

    const spinner = startSpinner('Scanning repositories...')
    const groups = await scanRepos(root)
    stopSpinner(spinner)

    // Search runs before free-text resolution so prefix queries like `vue/co` keep working.
    const repo = resolveGitHubRepo(resolvedTarget)
    const resolved = searchTarget(resolvedTarget, groups) ?? (await resolveRepoPath(root, repo))
    if (!resolved) {
      if (!isInteractive()) {
        console.error(
          `${icons.error} ${pc.red(`No matching directory found for '${resolvedTarget}'`)}`
        )
        throw new Error(`No match: ${resolvedTarget}`)
      }

      const initialQuery = repo ? `${repo.owner}/${repo.name}` : resolvedTarget
      return openSelector(root, groups, initialQuery, action, compositionAction)
    }
    console.log(`${icons.success} ${pc.cyan(toTildePath(resolved))}`)
    return action(resolved)
  }

  const spinner = startSpinner('Scanning repositories...')
  const groups = await scanRepos(root)
  stopSpinner(spinner)

  return openSelector(root, groups, '', action, compositionAction)
}

function openSelector<T>(
  root: string,
  groups: RepoGroup[],
  initialQuery: string,
  action: (targetPath: string) => T | Promise<T>,
  compositionAction: (command: SelectorCompositionCommand, repo: string) => T | Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const app = createApp(Selector, {
      root,
      groups,
      initialQuery,
      onSelect: (selectedPath: string) => {
        setTimeout(() => {
          app.unmount()
          resolve(action(selectedPath))
        }, 50)
      },
      onCompose: (command: SelectorCompositionCommand, repo: string) => {
        setTimeout(() => {
          app.unmount()
          resolve(compositionAction(command, repo))
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

// Without a terminal on both ends, the selector would wait for input that never comes.
function isInteractive(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY
}

async function resolveRepoPath(root: string, repo: GitHubRepo | null): Promise<string | null> {
  if (!repo) {
    return null
  }

  const candidate = path.join(root, repo.owner, repo.name)
  if ((await pathExists(candidate)) && (await stat(candidate)).isDirectory()) {
    return candidate
  }

  return null
}

function searchTarget(target: string, groups: RepoGroup[]): string | null {
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
