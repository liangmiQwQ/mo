import { readdirSync } from 'node:fs'
import path from 'node:path'
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

// ---- Types ----

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

// ---- Filesystem helpers ----

function readDirNames(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

export function collectOwnerGroups(root: string): OwnerGroup[] {
  return readDirNames(root).map((owner) => {
    const ownerPath = path.join(root, owner)
    return {
      name: owner,
      path: ownerPath,
      repos: readDirNames(ownerPath).map((repo) => ({
        name: repo,
        path: path.join(ownerPath, repo),
      })),
    }
  })
}

// ---- Item builders ----

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
      })
    }
  }

  return items
}

function buildSearchItems(query: string, root: string, groups: OwnerGroup[]): ListItem[] {
  const q = query.trim().toLowerCase()
  const items: ListItem[] = []

  if (q === '.' || q === '<root>') {
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
  const prefix = usePrefix({ status: 'idle', theme })

  const [searchTerm, setSearchTerm] = useState('')

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
        const err = new Error('Operation canceled.')
        err.name = 'ExitPromptError'
        throw err
      }
    } else if (isEnterKey(key)) {
      const selected = items[safeActive]
      if (selected && isSelectable(selected)) {
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

  const page = usePagination({
    items,
    active: safeActive,
    pageSize: PAGE_SIZE,
    loop: false,
    renderItem({ item, isActive }) {
      if (Separator.isSeparator(item)) {
        return ` ${item.separator}`
      }

      let displayName = item.name
      if (item.isOwner) {
        displayName = isActive ? displayName : pc.cyan(displayName)
        displayName = pc.bold(displayName)
      } else if (item.isRepoMatch) {
        displayName = `${item.name} ${pc.dim(`(${item.ownerName})`)}`
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

  // Sticky header: pin the active item's owner group label above the scrollable page when scrolled out of view
  let stickyHeader = ''
  if (!searchTerm) {
    const activeItem = items[safeActive]
    if (activeItem && isSelectable(activeItem) && activeItem.group) {
      const ownerIndex = items.findIndex(
        (i) => isSelectable(i) && i.isOwner && i.group === activeItem.group,
      )

      const middleOfList = Math.floor(PAGE_SIZE / 2)
      let startIndex = Math.max(0, safeActive - middleOfList)
      if (startIndex + PAGE_SIZE > items.length) {
        startIndex = Math.max(0, items.length - PAGE_SIZE)
      }

      if (ownerIndex !== -1 && ownerIndex < startIndex) {
        stickyHeader = `  ${pc.bold(pc.cyan(activeItem.group))}\n`
      }
    }
  }

  let helpTip = ''
  const currentItem = items[safeActive]
  if (currentItem && isSelectable(currentItem)) {
    const home = process.env.HOME || ''
    const p = currentItem.value.startsWith(home)
      ? currentItem.value.replace(home, '~')
      : currentItem.value
    helpTip = `\n\n  ${pc.gray(`Path: ${p}`)}`
  }

  const searchStr = pc.cyan(searchTerm)
  const header = [prefix, config.message, searchStr].filter(Boolean).join(' ').trimEnd()
  const body = `${stickyHeader}${page}${helpTip}`

  return [header, body]
})

export async function promptLocationPath(root: string): Promise<string> {
  const groups = collectOwnerGroups(root)
  return locationPrompt({ root, message: 'Where would you like to go?', groups }).catch(
    (err: unknown) => {
      if (err instanceof Error && err.name === 'ExitPromptError') {
        error('Operation canceled.', 78)
      }
      throw err
    },
  )
}
