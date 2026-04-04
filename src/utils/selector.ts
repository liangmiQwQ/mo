import React from 'react'
import { render } from 'ink'
import { Selector } from '../components/selector'
import { scanRepos } from './repos'
import { startSpinner, stopSpinner } from './format'

export async function withPathSelector<T>(
  root: string,
  target: string | undefined,
  action: (targetPath: string) => T | Promise<T>,
): Promise<T> {
  const resolvedTarget = target?.trim()

  // If a direct target is provided, resolve it without the UI
  if (resolvedTarget) {
    // TODO: resolve target to a path directly
    return action(resolvedTarget)
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
    )
  })
}
