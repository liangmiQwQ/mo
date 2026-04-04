import path from 'node:path'
import { readdirSync } from 'node:fs'
import { render, Box, Text, useInput } from 'ink'
import { useState, useMemo, useEffect } from 'react'
import pc from 'picocolors'
import { error } from './error'
import { toTildePath } from './format'

export type LocationOption = {
  label: string
  path: string
}

type OwnerGroup = {
  name: string
  path: string
  repos: Array<{ name: string; path: string }>
}

type Item = {
  value: string
  name: string
  short: string
  type: 'root' | 'owner' | 'repo'
  ownerName?: string
}

const PAGE_SIZE = 10
const POINTER = '❯'

// Collect all owner groups from root directory
function collectOwnerGroups(root: string): OwnerGroup[] {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .map((owner) => {
        const ownerPath = path.join(root, owner)
        return {
          name: owner,
          path: ownerPath,
          repos: readdirSync(ownerPath, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort()
            .map((repo) => ({
              name: repo,
              path: path.join(ownerPath, repo),
            })),
        }
      })
  } catch {
    return []
  }
}

// Build items for browse mode (grouped by owner)
function buildBrowseItems(root: string, groups: OwnerGroup[]): Item[] {
  const items: Item[] = [{ value: root, name: '<root>', short: '<root>', type: 'root' }]

  for (const group of groups) {
    items.push({
      value: group.path,
      name: group.name,
      short: group.name,
      type: 'owner',
    })
    for (const repo of group.repos) {
      items.push({
        value: repo.path,
        name: repo.name,
        short: `${group.name}/${repo.name}`,
        type: 'repo',
        ownerName: group.name,
      })
    }
  }

  return items
}

// Build items for search mode (filtered by query)
function buildSearchItems(query: string, root: string, groups: OwnerGroup[]): Item[] {
  const q = query.trim().toLowerCase()
  const items: Item[] = []

  // Root match
  if (q === '.' || q === 'root' || q === '<root>') {
    items.push({ value: root, name: '<root>', short: '<root>', type: 'root' })
  }

  // Repo matches (check repo name only)
  for (const group of groups) {
    for (const repo of group.repos) {
      if (repo.name.toLowerCase().includes(q)) {
        items.push({
          value: repo.path,
          name: repo.name,
          short: `${group.name}/${repo.name}`,
          type: 'repo',
          ownerName: group.name,
        })
      }
    }
  }

  // Owner matches
  for (const group of groups) {
    if (group.name.toLowerCase().includes(q)) {
      items.push({
        value: group.path,
        name: group.name,
        short: group.name,
        type: 'owner',
      })
    }
  }

  return items
}

// Calculate visible page range
function getPageRange(activeIndex: number, totalItems: number, pageSize: number) {
  const halfPage = Math.floor(pageSize / 2)
  let start = Math.max(0, activeIndex - halfPage)
  let end = Math.min(totalItems, start + pageSize)

  if (end - start < pageSize) {
    start = Math.max(0, end - pageSize)
  }

  return { start, end }
}

// Find the owner for sticky header
function findStickyOwner(items: Item[], visibleStart: number): string | null {
  // Look backwards from visibleStart to find the last owner
  for (let i = visibleStart - 1; i >= 0; i--) {
    if (items[i].type === 'owner') {
      return items[i].name
    }
  }
  return null
}

interface LocationSelectorProps {
  root: string
  groups: OwnerGroup[]
  onSelect: (path: string, displayText: string) => void
}

function LocationSelector({ root, groups, onSelect }: LocationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  // Get items based on mode
  const items = useMemo(() => {
    return searchTerm ? buildSearchItems(searchTerm, root, groups) : buildBrowseItems(root, groups)
  }, [searchTerm, root, groups])

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(0)
  }, [searchTerm])

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      if (searchTerm) {
        setSearchTerm('')
      } else {
        error('Operation canceled.', 78)
      }
      return
    }

    if (key.return) {
      const selected = items[activeIndex]
      if (selected) {
        let displayText = selected.name
        if (selected.type === 'root') displayText = '<root>'
        else if (selected.type === 'repo' && selected.ownerName) {
          displayText = `${selected.ownerName}/${selected.name}`
        }
        onSelect(selected.value, displayText)
      }
      return
    }

    if (key.upArrow) {
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
      return
    }

    if (key.downArrow) {
      setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev))
      return
    }

    // Regular input - update search
    if (input && !key.ctrl && !key.meta) {
      setSearchTerm((prev) => prev + input)
    } else if (key.backspace || key.delete) {
      setSearchTerm((prev) => prev.slice(0, -1))
    }
  })

  // Calculate visible page
  const { start, end } = getPageRange(activeIndex, items.length, PAGE_SIZE)
  const visibleItems = items.slice(start, end)
  const stickyOwner = !searchTerm ? findStickyOwner(items, start) : null

  // Find current item for help text
  const currentItem = items[activeIndex]

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text bold>Where would you like to go? </Text>
        {searchTerm && <Text color="cyan">{searchTerm}</Text>}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {/* Sticky header for browse mode */}
        {stickyOwner && (
          <Box paddingLeft={2}>
            <Text bold color="cyan">
              {stickyOwner}
            </Text>
          </Box>
        )}

        {/* Items list */}
        {visibleItems.map((item, idx) => {
          const actualIndex = start + idx
          const isActive = actualIndex === activeIndex
          const isLastVisibleOwner = item.type === 'owner' && stickyOwner === item.name

          // Skip rendering if this owner is shown as sticky header
          if (isLastVisibleOwner) return null

          let displayName = item.name

          if (item.type === 'owner') {
            displayName = item.name
          } else if (item.type === 'repo') {
            if (searchTerm && item.ownerName) {
              displayName = `${item.name} (${item.ownerName})`
            }
          }

          return (
            <Box key={item.value + actualIndex}>
              <Text color={isActive ? 'cyan' : undefined}>
                {isActive ? POINTER : ' '} {displayName}
              </Text>
            </Box>
          )
        })}
      </Box>

      {/* Help text */}
      <Box marginTop={1} paddingLeft={2}>
        {currentItem ? (
          <Text dimColor>Path: {toTildePath(currentItem.value)}</Text>
        ) : (
          <Text dimColor italic>
            No item found
          </Text>
        )}
      </Box>
    </Box>
  )
}

// Main export function - maintains same API as original
export async function promptLocationPath(root: string): Promise<string> {
  const groups = collectOwnerGroups(root)

  return new Promise((resolve, reject) => {
    const { waitUntilExit } = render(
      <LocationSelector
        root={root}
        groups={groups}
        onSelect={(selectedPath, displayText) => {
          const pathDisplay = pc.black(pc.dim(`(${toTildePath(selectedPath)})`))
          console.log(
            '\n' +
              pc.bold('Where would you like to go? ') +
              pc.cyan(`${displayText} ${pathDisplay}`),
          )
          resolve(selectedPath)
        }}
      />,
    )

    waitUntilExit().catch((err: unknown) => {
      if (err instanceof Error && err.name === 'ExitPromptError') {
        error('Operation canceled.', 78)
      }
      reject(err)
    })
  })
}

// Helper function for withPathSelector
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

// Resolve path from target string
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
  try {
    const exists = readdirSync(root, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && entry.name === owner,
    )
    if (!exists) {
      error(`Owner "${owner}" not found under configured root.`, 78)
    }
  } catch {
    error(`Owner "${owner}" not found under configured root.`, 78)
  }
  return ownerPath
}

function resolveRepoPath(root: string, owner: string, repo: string): string {
  const ownerPath = resolveOwnerPath(root, owner)
  const repoPath = path.join(ownerPath, repo)

  try {
    const exists = readdirSync(ownerPath, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && entry.name === repo,
    )
    if (!exists) {
      error(`Repository "${owner}/${repo}" not found under configured root.`, 78)
    }
  } catch {
    error(`Repository "${owner}/${repo}" not found under configured root.`, 78)
  }

  return repoPath
}
