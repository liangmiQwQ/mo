import { useState, useMemo, useCallback } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import pc from 'picocolors'
import type { RepoGroup } from '../utils/repos'
import { toTildePath } from '../utils/format'

// --- Types ---

type SelectorState = 'list' | 'search' | 'succeed' | 'error'

type ListItem = {
  type: 'root' | 'owner' | 'repo' | 'blank'
  label: string
  path: string
  owner?: string
  selectable: boolean
}

type SearchItem = {
  type: 'project' | 'owner'
  label: string
  owner?: string
  path: string
  selectable: boolean
}

type SelectorProps = {
  root: string
  groups: RepoGroup[]
  onSelect: (path: string) => void
  onCancel: () => void
}

// --- Constants ---

const LIST_HEIGHT = 15
const POINTER = '\u276F '
const POINTER_BLANK = '  '
const QUESTION = 'Where would you like to go? '

// --- List building ---

function buildListItems(root: string, groups: RepoGroup[]): ListItem[] {
  const items: ListItem[] = []

  // Root item
  items.push({
    type: 'root',
    label: '<root>',
    path: root,
    selectable: true,
  })

  for (const group of groups) {
    // Blank separator
    items.push({ type: 'blank', label: '', path: '', selectable: false })

    // Owner header
    items.push({
      type: 'owner',
      label: group.owner,
      path: group.path,
      owner: group.owner,
      selectable: true,
    })

    // Repos
    for (const repo of group.repos) {
      items.push({
        type: 'repo',
        label: repo.name,
        path: repo.path,
        owner: group.owner,
        selectable: true,
      })
    }
  }

  return items
}

// --- Search ---

function searchItems(query: string, groups: RepoGroup[], root: string): SearchItem[] {
  const q = query.toLowerCase()
  const items: SearchItem[] = []
  const matchedOwners = new Set<string>()

  // Search projects - only match by project name
  // Score: 0 = exact match, 1 = prefix match, 2 = substring match
  const projectMatches: Array<{ score: number; item: SearchItem }> = []
  for (const group of groups) {
    for (const repo of group.repos) {
      const name = repo.name.toLowerCase()
      if (!name.includes(q)) continue
      const score = name === q ? 0 : name.startsWith(q) ? 1 : 2
      projectMatches.push({
        score,
        item: {
          type: 'project',
          label: repo.name,
          owner: repo.owner,
          path: repo.path,
          selectable: true,
        },
      })
      matchedOwners.add(repo.owner)
    }
  }
  projectMatches.sort((a, b) => a.score - b.score || a.item.label.length - b.item.label.length)

  const sortedProjects: SearchItem[] = projectMatches.map((m) => m.item)

  // Root match - exact match gets score 0, prefix score 1, substring score 2
  if ('<root>'.includes(q)) {
    const rootScore = '<root>' === q ? 0 : '<root>'.startsWith(q) ? 1 : 2
    const rootItem: SearchItem = { type: 'project', label: '<root>', path: root, selectable: true }
    const insertIdx = sortedProjects.findIndex(
      (_, i) => (projectMatches[i]?.score ?? 3) > rootScore,
    )
    if (insertIdx === -1) sortedProjects.push(rootItem)
    else sortedProjects.splice(insertIdx, 0, rootItem)
  }

  items.push(...sortedProjects)

  // Search owners
  const ownerMatches: SearchItem[] = []
  for (const group of groups) {
    if (group.owner.toLowerCase().includes(q) || matchedOwners.has(group.owner)) {
      ownerMatches.push({
        type: 'owner',
        label: group.owner,
        path: group.path,
        selectable: true,
      })
    }
  }

  if (ownerMatches.length && sortedProjects.length) {
    // Blank separator
    items.push({
      type: 'owner',
      label: '',
      path: '',
      selectable: false,
    })
  }

  items.push(...ownerMatches)

  return items
}

function highlightMatch(text: string, query: string, baseColor: (s: string) => string): string {
  if (!query) return baseColor(text)
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return baseColor(text)

  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return baseColor(before) + pc.bold(pc.green(match)) + baseColor(after)
}

// --- Scroll logic ---

function computeScroll(cursorIndex: number, totalItems: number, height: number): number {
  if (totalItems <= height) return 0
  // Center the cursor
  let start = cursorIndex - Math.floor(height / 2)
  start = Math.max(0, start)
  start = Math.min(start, totalItems - height)
  return start
}

// --- Components ---

function Header({
  state,
  query,
  selectedPath,
  errorMessage,
}: {
  state: SelectorState
  query: string
  selectedPath: string
  errorMessage: string
}) {
  let icon = '?'
  let content = ''

  if (state === 'succeed') {
    icon = pc.green('\u2713')
    content = pc.bold(QUESTION) + pc.cyan(toTildePath(selectedPath))
  } else if (state === 'error') {
    icon = pc.red('\u2717')
    content = pc.bold(pc.red(errorMessage))
  } else {
    icon = pc.yellow('?')
    content = pc.bold(QUESTION) + query
  }

  return <Text>{`${icon} ${content}`}</Text>
}

function ListModeView({
  items,
  cursorIndex,
  scrollOffset,
  height,
}: {
  items: ListItem[]
  cursorIndex: number
  scrollOffset: number
  height: number
}) {
  // Find sticky owner: look backward from scrollOffset for the current group's owner
  let stickyOwner: ListItem | null = null
  if (scrollOffset > 0) {
    for (let i = scrollOffset - 1; i >= 0; i--) {
      if (items[i].type === 'owner') {
        // Check if the owner's group extends into the visible area
        stickyOwner = items[i]
        break
      }
      if (items[i].type === 'blank' && i < scrollOffset) {
        // We passed a group boundary without finding an owner above
        break
      }
    }
    // Verify the sticky owner's group is still visible
    if (stickyOwner) {
      let groupEnd = items.indexOf(stickyOwner) + 1
      while (groupEnd < items.length && items[groupEnd].type !== 'blank') {
        groupEnd++
      }
      if (groupEnd <= scrollOffset) {
        stickyOwner = null
      }
    }
  }

  // If the owner header is already visible in the viewport, don't show sticky
  if (stickyOwner) {
    const ownerIdx = items.indexOf(stickyOwner)
    if (ownerIdx >= scrollOffset && ownerIdx < scrollOffset + height) {
      stickyOwner = null
    }
  }

  const adjustedHeight = stickyOwner ? height - 1 : height
  const displayStart = stickyOwner ? scrollOffset + 1 : scrollOffset
  const displayItems = items.slice(displayStart, displayStart + adjustedHeight)

  const lines: string[] = []

  if (stickyOwner) {
    const isSelected = items.indexOf(stickyOwner) === cursorIndex
    const prefix = isSelected ? POINTER : POINTER_BLANK
    lines.push(prefix + pc.bold(pc.cyan(stickyOwner.label)))
  }

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i]
    const actualIndex = displayStart + i
    const isSelected = actualIndex === cursorIndex

    if (item.type === 'blank') {
      lines.push('')
      continue
    }

    const prefix = isSelected ? POINTER : POINTER_BLANK

    if (item.type === 'owner') {
      const text = isSelected ? pc.underline(pc.green(item.label)) : pc.bold(pc.cyan(item.label))
      lines.push(prefix + text)
    } else {
      const text = isSelected ? pc.underline(pc.green(item.label)) : item.label
      lines.push(prefix + text)
    }
  }

  return <Text>{lines.join('\n')}</Text>
}

function SearchModeView({
  items,
  cursorIndex,
  scrollOffset,
  height,
  query,
}: {
  items: SearchItem[]
  cursorIndex: number
  scrollOffset: number
  height: number
  query: string
}) {
  const visibleItems = items.slice(scrollOffset, scrollOffset + height)
  const lines: string[] = []

  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i]
    const actualIndex = scrollOffset + i
    const isSelected = actualIndex === cursorIndex

    if (!item.selectable) {
      lines.push('')
      continue
    }

    const prefix = isSelected ? POINTER : POINTER_BLANK

    if (item.type === 'project') {
      if (isSelected) {
        const name = pc.underline(pc.green(item.label))
        const suffix = item.owner ? pc.dim(` (${item.owner})`) : ''
        lines.push(prefix + name + suffix)
      } else {
        const name = highlightMatch(item.label, query, (s) => s)
        const suffix = item.owner ? pc.dim(` (${item.owner})`) : ''
        lines.push(prefix + name + suffix)
      }
    } else {
      if (isSelected) {
        lines.push(prefix + pc.underline(pc.green(item.label)))
      } else {
        lines.push(prefix + highlightMatch(item.label, query, pc.gray))
      }
    }
  }

  return <Text>{lines.join('\n')}</Text>
}

function Footer({ path: footerPath, noMatch }: { path: string; noMatch: boolean }) {
  const text = noMatch
    ? pc.dim(pc.italic('No directory found'))
    : pc.dim('Path: ') + pc.gray(toTildePath(footerPath))
  return (
    <Box marginTop={1}>
      <Text>{text}</Text>
    </Box>
  )
}

// --- Main Selector ---

export function Selector({ root, groups, onSelect, onCancel }: SelectorProps) {
  const { exit } = useApp()
  const [state, setState] = useState<SelectorState>('list')
  const [query, setQuery] = useState('')
  const [cursorIndex, setCursorIndex] = useState(0)
  const [selectedPath, setSelectedPath] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const listItems = useMemo(() => buildListItems(root, groups), [root, groups])
  const searchResults = useMemo(
    () => (query ? searchItems(query, groups, root) : []),
    [query, groups, root],
  )

  const isSearchMode = query.length > 0
  const currentItems = isSearchMode ? searchResults : listItems
  const selectableIndices = useMemo(
    () => currentItems.map((item, i) => (item.selectable ? i : -1)).filter((i) => i !== -1),
    [currentItems],
  )

  const scrollOffset = useMemo(
    () => computeScroll(cursorIndex, currentItems.length, LIST_HEIGHT),
    [cursorIndex, currentItems.length],
  )

  const currentPath = useMemo(() => {
    if (!selectableIndices.length) return ''
    const item = currentItems[cursorIndex]
    return item?.path || ''
  }, [currentItems, cursorIndex, selectableIndices])

  const moveCursor = useCallback(
    (direction: 1 | -1) => {
      if (!selectableIndices.length) return
      const currentSelIdx = selectableIndices.indexOf(cursorIndex)
      let nextSelIdx = currentSelIdx + direction
      if (nextSelIdx < 0) nextSelIdx = selectableIndices.length - 1
      if (nextSelIdx >= selectableIndices.length) nextSelIdx = 0
      setCursorIndex(selectableIndices[nextSelIdx])
    },
    [selectableIndices, cursorIndex],
  )

  // Reset cursor when switching modes or query changes
  const resetCursor = useCallback((items: Array<{ selectable: boolean }>) => {
    const firstSelectable = items.findIndex((item) => item.selectable)
    setCursorIndex(firstSelectable >= 0 ? firstSelectable : 0)
  }, [])

  useInput((input, key) => {
    if (state === 'succeed' || state === 'error') return

    // Cancel
    if (key.escape || (key.ctrl && input === 'c')) {
      setState('error')
      setErrorMessage('Canceled.')
      onCancel()
      setTimeout(() => exit(), 0)
      return
    }

    // Submit
    if (key.return) {
      if (currentPath) {
        setState('succeed')
        setSelectedPath(currentPath)
        onSelect(currentPath)
        setTimeout(() => exit(), 0)
      }
      return
    }

    // Navigation
    if (key.upArrow) {
      moveCursor(-1)
      return
    }
    if (key.downArrow) {
      moveCursor(1)
      return
    }

    // Tab handling - ignore
    if (key.tab) return

    // Backspace
    if (key.backspace || key.delete) {
      const newQuery = query.slice(0, -1)
      setQuery(newQuery)
      if (newQuery) {
        const newResults = searchItems(newQuery, groups, root)
        resetCursor(newResults)
      } else {
        resetCursor(listItems)
      }
      return
    }

    // Typing - switch to search mode
    if (input && !key.ctrl && !key.meta) {
      const newQuery = query + input
      setQuery(newQuery)
      const newResults = searchItems(newQuery, groups, root)
      resetCursor(newResults)
    }
  })

  const showBody = state === 'list' || state === 'search'

  return (
    <Box flexDirection="column">
      <Header
        state={isSearchMode ? 'search' : state}
        query={query}
        selectedPath={selectedPath}
        errorMessage={errorMessage}
      />
      {showBody && (
        <>
          {isSearchMode ? (
            <SearchModeView
              items={searchResults}
              cursorIndex={cursorIndex}
              scrollOffset={scrollOffset}
              height={LIST_HEIGHT}
              query={query}
            />
          ) : (
            <ListModeView
              items={listItems}
              cursorIndex={cursorIndex}
              scrollOffset={scrollOffset}
              height={LIST_HEIGHT}
            />
          )}
          <Footer path={currentPath} noMatch={!selectableIndices.length} />
        </>
      )}
    </Box>
  )
}
