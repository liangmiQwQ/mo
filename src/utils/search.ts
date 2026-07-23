import type { RepoEntry, RepoGroup } from './repos.ts'

export interface RepoNameMatch {
  repo: RepoEntry
  score: number
}

export function getMatchScore(text: string, query: string): number | null {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return null
  }
  if (!normalizedText.includes(normalizedQuery)) {
    return null
  }

  if (normalizedText === normalizedQuery) {
    return 0
  }
  if (normalizedText.startsWith(normalizedQuery)) {
    return 1
  }
  return 2
}

export function searchReposByName(query: string, groups: RepoGroup[]): RepoNameMatch[] {
  const matches: RepoNameMatch[] = []
  const searchByPath = query.trim().includes('/')

  for (const group of groups) {
    for (const repo of group.repos) {
      const matchText = searchByPath ? `${repo.owner}/${repo.name}` : repo.name
      const score = getMatchScore(matchText, query)
      if (score === null) {
        continue
      }

      matches.push({ repo, score })
    }
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }

    const aMatchText = searchByPath ? `${a.repo.owner}/${a.repo.name}` : a.repo.name
    const bMatchText = searchByPath ? `${b.repo.owner}/${b.repo.name}` : b.repo.name
    if (aMatchText.length !== bMatchText.length) {
      return aMatchText.length - bMatchText.length
    }

    const byName = aMatchText.localeCompare(bMatchText)
    if (byName !== 0) {
      return byName
    }

    return a.repo.owner.localeCompare(b.repo.owner)
  })

  return matches
}

export function searchOwnerGroupsByName(query: string, groups: RepoGroup[]): RepoGroup[] {
  const matches: { group: RepoGroup; score: number }[] = []

  for (const group of groups) {
    const score = getMatchScore(group.owner, query)
    if (score === null) {
      continue
    }

    matches.push({ group, score })
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }
    if (a.group.owner.length !== b.group.owner.length) {
      return a.group.owner.length - b.group.owner.length
    }

    return a.group.owner.localeCompare(b.group.owner)
  })

  return matches.map(match => match.group)
}
