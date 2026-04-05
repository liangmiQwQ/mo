import type { RepoEntry, RepoGroup } from './repos'

export type RepoNameMatch = {
  repo: RepoEntry
  score: number
}

export function getMatchScore(text: string, query: string): number | null {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) return null
  if (!normalizedText.includes(normalizedQuery)) return null

  if (normalizedText === normalizedQuery) return 0
  if (normalizedText.startsWith(normalizedQuery)) return 1
  return 2
}

export function searchReposByName(query: string, groups: RepoGroup[]): RepoNameMatch[] {
  const matches: RepoNameMatch[] = []

  for (const group of groups) {
    for (const repo of group.repos) {
      const score = getMatchScore(repo.name, query)
      if (score === null) continue

      matches.push({ repo, score })
    }
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.repo.name.length !== b.repo.name.length) return a.repo.name.length - b.repo.name.length

    const byName = a.repo.name.localeCompare(b.repo.name)
    if (byName !== 0) return byName

    return a.repo.owner.localeCompare(b.repo.owner)
  })

  return matches
}

export function searchOwnerGroupsByName(query: string, groups: RepoGroup[]): RepoGroup[] {
  const matches: Array<{ group: RepoGroup; score: number }> = []

  for (const group of groups) {
    const score = getMatchScore(group.owner, query)
    if (score === null) continue

    matches.push({ group, score })
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.group.owner.length !== b.group.owner.length)
      return a.group.owner.length - b.group.owner.length

    return a.group.owner.localeCompare(b.group.owner)
  })

  return matches.map((match) => match.group)
}
