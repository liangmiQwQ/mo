<script setup lang="ts">
import { Box, Text, useInput } from '@vue-tui/runtime'
import pc from 'picocolors'
import { computed, shallowRef } from 'vue'

import { toTildePath } from '../utils/format.ts'
import type { RepoGroup } from '../utils/repos.ts'
import { getMatchScore, searchReposByName } from '../utils/search.ts'

type SelectorState = 'list' | 'search' | 'succeed' | 'error'

interface ListItem {
  type: 'root' | 'owner' | 'repo' | 'blank'
  label: string
  path: string
  owner?: string
  selectable: boolean
}

interface SearchItem {
  type: 'project' | 'owner'
  label: string
  owner?: string
  path: string
  selectable: boolean
}

type SelectorItem = ListItem | SearchItem

interface SelectorProps {
  root: string
  groups: RepoGroup[]
  onSelect: (path: string) => void
  onCancel: () => void
}

defineOptions({
  name: 'Selector'
})

const { root, groups, onSelect, onCancel } = defineProps<SelectorProps>()

const LIST_HEIGHT = 15
const POINTER = '\u276F '
const POINTER_BLANK = '  '
const QUESTION = 'Where would you like to go? '

const state = shallowRef<SelectorState>('list')
const query = shallowRef('')
const cursorIndex = shallowRef(0)
const selectedPath = shallowRef('')
const errorMessage = shallowRef('')

const listItems = computed(() => buildListItems(root, groups))
const searchResults = computed(() => (query.value ? searchItems(query.value, groups, root) : []))
const isSearchMode = computed(() => query.value.length > 0)
const currentItems = computed<SelectorItem[]>(() =>
  isSearchMode.value ? searchResults.value : listItems.value
)
const selectableIndices = computed(() =>
  currentItems.value.map((item, i) => (item.selectable ? i : -1)).filter(i => i !== -1)
)
const scrollOffset = computed(() =>
  computeScroll(cursorIndex.value, currentItems.value.length, LIST_HEIGHT)
)
const currentPath = computed(() => {
  if (selectableIndices.value.length === 0) {
    return ''
  }
  return currentItems.value[cursorIndex.value]?.path || ''
})
const headerText = computed(() =>
  renderHeader(
    isSearchMode.value && state.value === 'list' ? 'search' : state.value,
    query.value,
    selectedPath.value,
    errorMessage.value
  )
)
const bodyLines = computed(() =>
  isSearchMode.value
    ? renderSearchLines(
        searchResults.value,
        cursorIndex.value,
        scrollOffset.value,
        LIST_HEIGHT,
        query.value
      )
    : renderListLines(listItems.value, cursorIndex.value, scrollOffset.value, LIST_HEIGHT)
)
const footerText = computed(() =>
  selectableIndices.value.length === 0
    ? pc.dim(pc.italic('No directory found'))
    : pc.dim('Path: ') + pc.gray(toTildePath(currentPath.value))
)
const showBody = computed(() => state.value === 'list' || state.value === 'search')

useInput((input, key) => {
  if (state.value === 'succeed' || state.value === 'error') {
    return
  }

  if (key.ctrl && input === 'c') {
    cancel()
    return
  }

  if (key.escape) {
    if (query.value) {
      query.value = ''
      resetCursor(listItems.value)
    } else {
      cancel()
    }
    return
  }

  if (key.return) {
    if (currentPath.value) {
      state.value = 'succeed'
      selectedPath.value = currentPath.value
      onSelect(currentPath.value)
    }
    return
  }

  if (key.upArrow) {
    moveCursor(-1)
    return
  }

  if (key.downArrow) {
    moveCursor(1)
    return
  }

  if (key.tab) {
    return
  }

  if (key.backspace || key.delete) {
    const newQuery = query.value.slice(0, -1)
    query.value = newQuery
    resetCursor(newQuery ? searchItems(newQuery, groups, root) : listItems.value)
    return
  }

  if (input && !key.ctrl && !key.meta) {
    const newQuery = query.value + input
    query.value = newQuery
    resetCursor(searchItems(newQuery, groups, root))
  }
})

function buildListItems(root: string, groups: RepoGroup[]): ListItem[] {
  const items: ListItem[] = [
    {
      type: 'root',
      label: '<root>',
      path: root,
      selectable: true
    }
  ]

  for (const group of groups) {
    items.push({ type: 'blank', label: '', path: '', selectable: false })
    items.push({
      type: 'owner',
      label: group.owner,
      path: group.path,
      owner: group.owner,
      selectable: true
    })

    for (const repo of group.repos) {
      items.push({
        type: 'repo',
        label: repo.name,
        path: repo.path,
        owner: group.owner,
        selectable: true
      })
    }
  }

  return items
}

function searchItems(queryText: string, groups: RepoGroup[], root: string): SearchItem[] {
  const q = queryText.toLowerCase()
  const items: SearchItem[] = []
  const projectMatches = searchReposByName(queryText, groups)
  const sortedProjects: SearchItem[] = projectMatches.map(match => ({
    type: 'project',
    label: match.repo.name,
    owner: match.repo.owner,
    path: match.repo.path,
    selectable: true
  }))
  const matchedOwners = new Set(projectMatches.map(match => match.repo.owner))

  if ('<root>'.includes(q)) {
    const rootScore = getMatchScore('<root>', queryText) ?? 3
    const rootItem: SearchItem = { type: 'project', label: '<root>', path: root, selectable: true }
    const insertIdx = sortedProjects.findIndex(
      (_, i) => (projectMatches[i]?.score ?? 3) > rootScore
    )
    if (insertIdx === -1) {
      sortedProjects.push(rootItem)
    } else {
      sortedProjects.splice(insertIdx, 0, rootItem)
    }
  }

  items.push(...sortedProjects)

  const ownerMatches: SearchItem[] = []
  for (const group of groups) {
    if (group.owner.toLowerCase().includes(q) || matchedOwners.has(group.owner)) {
      ownerMatches.push({
        type: 'owner',
        label: group.owner,
        path: group.path,
        selectable: true
      })
    }
  }

  if (ownerMatches.length > 0 && sortedProjects.length > 0) {
    items.push({
      type: 'owner',
      label: '',
      path: '',
      selectable: false
    })
  }

  items.push(...ownerMatches)
  return items
}

function highlightMatch(text: string, queryText: string, baseColor: (s: string) => string): string {
  if (!queryText) {
    return baseColor(text)
  }
  const lower = text.toLowerCase()
  const qLower = queryText.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) {
    return baseColor(text)
  }

  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + queryText.length)
  const after = text.slice(idx + queryText.length)
  return baseColor(before) + pc.bold(pc.green(match)) + baseColor(after)
}

function computeScroll(index: number, totalItems: number, height: number): number {
  if (totalItems <= height) {
    return 0
  }
  let start = index - Math.floor(height / 2)
  start = Math.max(0, start)
  return Math.min(start, totalItems - height)
}

function renderHeader(
  currentState: SelectorState,
  queryText: string,
  path: string,
  error: string
): string {
  if (currentState === 'succeed') {
    return `${pc.green('\u2713')} ${pc.bold(QUESTION)}${pc.cyan(toTildePath(path))}`
  }

  if (currentState === 'error') {
    return `${pc.red('\u2717')} ${pc.bold(pc.red(error))}`
  }

  return `${pc.yellow('?')} ${pc.bold(QUESTION)}${queryText}`
}

function renderListLines(
  items: ListItem[],
  index: number,
  offset: number,
  height: number
): string[] {
  const stickyOwner = getStickyOwner(items, offset, height)
  const adjustedHeight = stickyOwner ? height - 1 : height
  const displayStart = stickyOwner ? offset + 1 : offset
  const displayItems = items.slice(displayStart, displayStart + adjustedHeight)
  const lines: string[] = []

  if (stickyOwner) {
    const isSelected = items.indexOf(stickyOwner) === index
    const prefix = isSelected ? POINTER : POINTER_BLANK
    lines.push(prefix + pc.bold(pc.cyan(stickyOwner.label)))
  }

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i]
    const actualIndex = displayStart + i
    const isSelected = actualIndex === index

    if (item.type === 'blank') {
      lines.push('')
      continue
    }

    const prefix = isSelected ? POINTER : POINTER_BLANK

    const text = isSelected
      ? pc.underline(pc.green(item.label))
      : item.type === 'owner'
        ? pc.bold(pc.cyan(item.label))
        : item.label
    lines.push(prefix + text)
  }

  return lines
}

function getStickyOwner(items: ListItem[], offset: number, height: number): ListItem | null {
  let stickyOwner: ListItem | null = null
  if (offset > 0) {
    for (let i = offset - 1; i >= 0; i--) {
      if (items[i].type === 'owner') {
        stickyOwner = items[i]
        break
      }
      if (items[i].type === 'blank' && i < offset) {
        break
      }
    }

    if (stickyOwner) {
      let groupEnd = items.indexOf(stickyOwner) + 1
      while (groupEnd < items.length && items[groupEnd].type !== 'blank') {
        groupEnd++
      }
      if (groupEnd <= offset) {
        stickyOwner = null
      }
    }
  }

  if (stickyOwner) {
    const ownerIdx = items.indexOf(stickyOwner)
    if (ownerIdx >= offset && ownerIdx < offset + height) {
      return null
    }
  }

  return stickyOwner
}

function renderSearchLines(
  items: SearchItem[],
  index: number,
  offset: number,
  height: number,
  queryText: string
): string[] {
  const visibleItems = items.slice(offset, offset + height)
  const lines: string[] = []

  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i]
    const actualIndex = offset + i
    const isSelected = actualIndex === index

    if (!item.selectable) {
      lines.push('')
      continue
    }

    const prefix = isSelected ? POINTER : POINTER_BLANK

    if (item.type === 'project') {
      const name = isSelected
        ? pc.underline(pc.green(item.label))
        : highlightMatch(item.label, queryText, s => s)
      const suffix = item.owner ? pc.dim(` (${item.owner})`) : ''
      lines.push(prefix + name + suffix)
    } else {
      const name = isSelected
        ? pc.underline(pc.green(item.label))
        : highlightMatch(item.label, queryText, pc.gray)
      lines.push(prefix + name)
    }
  }

  return lines
}

function moveCursor(direction: 1 | -1): void {
  if (selectableIndices.value.length === 0) {
    return
  }
  const currentSelIdx = selectableIndices.value.indexOf(cursorIndex.value)
  let nextSelIdx = currentSelIdx + direction
  if (nextSelIdx < 0) {
    nextSelIdx = selectableIndices.value.length - 1
  }
  if (nextSelIdx >= selectableIndices.value.length) {
    nextSelIdx = 0
  }
  cursorIndex.value = selectableIndices.value[nextSelIdx]
}

function resetCursor(items: { selectable: boolean }[]): void {
  const firstSelectable = items.findIndex(item => item.selectable)
  cursorIndex.value = Math.max(firstSelectable, 0)
}

function cancel(): void {
  state.value = 'error'
  errorMessage.value = 'Canceled.'
  onCancel()
}
</script>

<template>
  <Box flex-direction="column">
    <Text>{{ headerText }}</Text>
    <template v-if="showBody">
      <Text>{{ bodyLines.join('\n') }}</Text>
      <Box :margin-top="1">
        <Text>{{ footerText }}</Text>
      </Box>
    </template>
  </Box>
</template>
