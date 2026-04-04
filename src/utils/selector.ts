import path from 'node:path'
import { readdirSync } from 'node:fs'
import {
  Separator,
  createPrompt,
  isDownKey,
  isEnterKey,
  isUpKey,
  makeTheme,
  useMemo,
  usePagination,
  useKeypress,
  usePrefix,
  useState,
} from '@inquirer/core'
import figures from '@inquirer/figures'
import pc from 'picocolors'
import { error } from './error'
import { toTildePath } from './format'

export type LocationOption = {
  label: string
  path: string
}

// ---- Types from location-prompt ----

type OwnerGroup = {
  name: string
  path: string
  repos: Array<{ name: string; path: string }>
}

type LocationChoice = {
  value: string
  name: string
  short: string
  group: string | null
  isOwner?: boolean
  isRoot?: boolean
  isRepoMatch?: boolean
  ownerName?: string
}

type ListItem = LocationChoice | Separator

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

export function collectOwnerGroups(root: string): OwnerGroup[] {
  return readDirectoryNames(root).map((owner) => {
    const ownerPath = path.join(root, owner)
    return {
      name: owner,
      path: ownerPath,
      repos: readDirectoryNames(ownerPath).map((repo) => ({
        name: repo,
        path: path.join(ownerPath, repo),
      })),
    }
  })
}

function isSelectable(item: ListItem): item is LocationChoice {
  return !Separator.isSeparator(item)
}

function buildBrowseItems(root: string, groups: OwnerGroup[]): ListItem[] {
  const items: ListItem[] = [
    { value: root, name: '<root>', short: '<root>', group: null, isRoot: true },
  ]

  for (const group of groups) {
    items.push(new Separator(' '))
    items.push({
      value: group.path,
      name: group.name,
      short: group.name,
      group: group.name,
      isOwner: true,
    })
    for (const repo of group.repos) {
      items.push({
        value: repo.path,
        name: repo.name,
        short: `${group.name}/${repo.name}`,
        group: group.name,
        ownerName: group.name,
      })
    }
  }

  return items
}

function buildSearchItems(query: string, root: string, groups: OwnerGroup[]): ListItem[] {
  const q = query.trim().toLowerCase()
  const items: ListItem[] = []

  if (q === '.' || q === 'root' || q === '<root>') {
    items.push({ value: root, name: '<root>', short: '<root>', group: null, isRoot: true })
  }

  const repoMatches: LocationChoice[] = []
  for (const group of groups) {
    for (const repo of group.repos) {
      if (repo.name.toLowerCase().includes(q)) {
        repoMatches.push({
          value: repo.path,
          name: repo.name,
          short: `${group.name}/${repo.name}`,
          group: null,
          isRepoMatch: true,
          ownerName: group.name,
        })
      }
    }
  }
  items.push(...repoMatches)

  const ownerMatches = groups.filter((g) => g.name.toLowerCase().includes(q))
  if (ownerMatches.length > 0) {
    if (items.length > 0) {
      items.push(new Separator(' '))
    }
    for (const g of ownerMatches) {
      items.push({
        value: g.path,
        name: g.name,
        short: g.name,
        group: null,
        isOwner: true,
      })
    }
  }

  return items
}

// ---- Prompt ----

const PAGE_SIZE = 10

const locationPrompt = createPrompt<
  string,
  { root: string; message: string; groups: OwnerGroup[] }
>((config, done) => {
  const { root, groups } = config
  const theme = makeTheme({})
  const [status, setStatus] = useState<'idle' | 'done'>('idle')
  const prefix = usePrefix({ status, theme })

  const [searchTerm, setSearchTerm] = useState('')
  const [doneText, setDoneText] = useState('')

  const items = useMemo<ListItem[]>(
    () =>
      searchTerm ? buildSearchItems(searchTerm, root, groups) : buildBrowseItems(root, groups),
    [searchTerm],
  )

  const bounds = useMemo(() => {
    const first = items.findIndex(isSelectable)
    const last = items.findLastIndex(isSelectable)
    return { first, last }
  }, [items])

  const [active, setActive] = useState<number | undefined>(undefined)
  const safeActive = active ?? bounds.first

  useKeypress((key, rl) => {
    if (key.name === 'escape') {
      if (searchTerm) {
        setSearchTerm('')
        if ('line' in rl) {
          // @ts-ignore Let's try gently clearing it
          rl.line = ''
          // @ts-ignore
          rl.cursor = 0
        }
      } else {
        error('Operation canceled.', 78)
      }
    } else if (isEnterKey(key)) {
      const selected = items[safeActive]
      if (selected && isSelectable(selected)) {
        setStatus('done')

        let dp = selected.name
        if (selected.isOwner) dp = selected.name
        else if (selected.isRoot) dp = '<root>'
        else if (selected.isRepoMatch) dp = `${selected.ownerName}/${selected.name}`
        else if (selected.group) dp = `${selected.group}/${selected.name}`

        setDoneText(dp + ` ${pc.black(pc.dim(`(${toTildePath(selected.value)})`))}`)
        done(selected.value)
      } else {
        rl.write(searchTerm)
      }
    } else if (isUpKey(key) || isDownKey(key)) {
      rl.clearLine(0)
      if (
        (isUpKey(key) && safeActive !== bounds.first) ||
        (isDownKey(key) && safeActive !== bounds.last)
      ) {
        const offset = isUpKey(key) ? -1 : 1
        let next = safeActive
        do {
          next = (next + offset + items.length) % items.length
        } while (!isSelectable(items[next]))
        setActive(next)
      }
    } else {
      setActive(undefined)
      setSearchTerm(rl.line)
    }
  })

  // Sticky header: pin the owner group label above the scrollable page when the owner header is scrolled out of view
  // The sticky header remains until the next owner header enters the visible area
  let stickyHeader = ''
  let pageSizeForItems = PAGE_SIZE
  if (!searchTerm) {
    // Find all owner items
    const ownerIndices: Array<{ index: number; group: string }> = []
    items.forEach((item, idx) => {
      if (isSelectable(item) && item.isOwner && item.group) {
        ownerIndices.push({ index: idx, group: item.group })
      }
    })

    // First compute with full page size
    let initialPageSize = PAGE_SIZE
    let middleOfList = Math.floor(initialPageSize / 2)
    let startIndex = Math.max(0, safeActive - middleOfList)
    if (startIndex + initialPageSize > items.length) {
      startIndex = Math.max(0, items.length - initialPageSize)
    }

    // Find the last owner header that is scrolled out of view
    // (closest to the visible area but above it)
    let candidate: { index: number; group: string } | undefined

    // Iterate from bottom to top to find the closest owner above startIndex
    for (let i = ownerIndices.length - 1; i >= 0; i--) {
      const owner = ownerIndices[i]
      if (owner.index < startIndex) {
        candidate = owner
        break
      }
    }

    if (candidate) {
      // Find the next owner header after the candidate
      const candidateIdx = ownerIndices.findIndex((o) => o.index === candidate!.index)
      const nextOwnerIdx =
        candidateIdx + 1 < ownerIndices.length ? ownerIndices[candidateIdx + 1].index : Infinity

      // Show sticky header if:
      // 1. Candidate owner header is still above visible area (owner.index < startIndex)
      // 2. Next owner header hasn't entered visible area yet (nextOwnerIdx > startIndex)
      // The sticky header disappears one item before the next owner header enters the view
      if (candidate.index < startIndex && nextOwnerIdx > startIndex) {
        stickyHeader = `  ${pc.bold(pc.cyan(candidate.group))}\n`
        // When sticky header is shown, reduce page size by 1 to keep total lines constant
        pageSizeForItems = PAGE_SIZE - 1

        // Recompute startIndex with adjusted page size
        middleOfList = Math.floor(pageSizeForItems / 2)
        startIndex = Math.max(0, safeActive - middleOfList)
        if (startIndex + pageSizeForItems > items.length) {
          startIndex = Math.max(0, items.length - pageSizeForItems)
        }

        // Re-check condition with new startIndex
        const candidateIdx2 = ownerIndices.findIndex((o) => o.index === candidate!.index)
        const nextOwnerIdx2 =
          candidateIdx2 + 1 < ownerIndices.length ? ownerIndices[candidateIdx2 + 1].index : Infinity

        if (!(candidate.index < startIndex && nextOwnerIdx2 > startIndex)) {
          // If condition no longer holds with adjusted page size, remove sticky header
          stickyHeader = ''
          pageSizeForItems = PAGE_SIZE
        }
      }
    }
  }

  const page = usePagination({
    items,
    active: safeActive,
    pageSize: pageSizeForItems,
    loop: false,
    renderItem({ item, isActive }) {
      if (Separator.isSeparator(item)) {
        return ` ${item.separator}`
      }

      let displayName = item.name
      if (item.isOwner) {
        if (searchTerm) {
          displayName = isActive ? displayName : pc.black(pc.dim(displayName))
        } else {
          displayName = isActive ? displayName : pc.cyan(displayName)
          displayName = pc.bold(displayName)
        }
      } else if (item.ownerName) {
        displayName = searchTerm
          ? `${item.name} ${pc.black(pc.dim(`(${item.ownerName})`))}`
          : item.name
      } else if (item.isRoot) {
        // stay as is
      }

      const cursor = isActive ? pc.cyan(figures.pointer) : ' '
      const text = isActive
        ? theme.style.highlight(displayName)
        : pc.gray(item.name === displayName && !item.isOwner ? item.name : displayName)
      return `${cursor} ${text}`
    },
  })

  let helpTip = ''
  const currentItem = items[safeActive]
  if (currentItem && isSelectable(currentItem)) {
    helpTip = `${pc.dim('\n\n  Path: ')}${pc.gray(toTildePath(currentItem.value))}`
  } else {
    helpTip = pc.dim(pc.italic('\n\n  No item found'))
  }

  const searchStr = pc.cyan(searchTerm)
  const header = [prefix, config.message, searchStr].filter(Boolean).join(' ').trimEnd()

  if (status === 'done') {
    return `${prefix} ${config.message} ${pc.cyan(doneText)}`
  }

  const body = `${stickyHeader}${page}${helpTip}`

  return [header, body]
})

export async function promptLocationPath(root: string): Promise<string> {
  const groups = collectOwnerGroups(root)
  return locationPrompt({ root, message: pc.bold('Where would you like to go?'), groups }).catch(
    (err: unknown) => {
      if (err instanceof Error && err.name === 'ExitPromptError') {
        error('Operation canceled.', 78)
      }
      throw err
    },
  )
}
