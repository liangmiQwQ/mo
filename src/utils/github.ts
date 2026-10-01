import { error } from './error.ts'

export interface GitHubRepo {
  owner: string
  name: string
}

export function parseGitHubRepo(input: string): GitHubRepo {
  const repo = resolveGitHubRepo(input)

  if (!repo) {
    error('Invalid repository format. Use <owner>/<repo> or a GitHub repository URL.')
  }

  return repo
}

export function parseGitHubRepoInput(input: string): GitHubRepo | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  return parseGitHubUrl(trimmed) ?? parseGitHubSpec(trimmed)
}

export function resolveGitHubRepo(input: string): GitHubRepo | null {
  return parseGitHubRepoInput(input) ?? findGitHubUrl(input) ?? findGitHubSpec(input)
}

const tokenSeparator = /[\s"'`()[\]{}<>]+/
// Sentence punctuation is never part of a copied repository, even though `.` is valid in repo names.
const trailingPunctuation = /[.,:;!?]+$/
// The lookbehind keeps scheme-less URLs from matching inside other hosts, like `notgithub.com/a/b`.
const urlCandidate =
  /(?:git\+)?(?:https?|ssh):\/\/[^\s"'`()[\]{}<>]+|(?<![\w.-])(?:git@github\.com:|(?:www\.)?github\.com\/)[^\s"'`()[\]{}<>]+/gi

// A URL wins over a bare token, so every URL is tried before any token.
function findGitHubUrl(text: string): GitHubRepo | null {
  for (const [candidate] of text.matchAll(urlCandidate)) {
    const repo = parseGitHubUrl(candidate)
    if (repo) {
      return repo
    }
  }

  return null
}

function findGitHubSpec(text: string): GitHubRepo | null {
  for (const token of text.split(tokenSeparator)) {
    const repo = parseGitHubSpec(token)
    if (repo) {
      return repo
    }
  }

  return null
}

function parseGitHubUrl(input: string): GitHubRepo | null {
  let url: URL

  try {
    url = new URL(normalizeGitHubUrl(input.replace(trailingPunctuation, '')))
  } catch {
    return null
  }

  if (!['http:', 'https:', 'ssh:'].includes(url.protocol)) {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (host !== 'github.com' && host !== 'www.github.com') {
    return null
  }

  // Deep links like `/pull/123` or `/tree/main/src` still point to the same repository.
  const parts = url.pathname.split('/')
  return parts.length < 3 ? null : toGitHubRepo(parts[1], parts[2])
}

function normalizeGitHubUrl(input: string): string {
  if (input.startsWith('git+')) {
    return input.slice(4)
  }
  if (/^git@github\.com:/i.test(input)) {
    return `ssh://git@github.com/${input.slice('git@github.com:'.length)}`
  }
  if (/^(?:www\.)?github\.com\//i.test(input)) {
    return `https://${input}`
  }

  return input
}

function parseGitHubSpec(input: string): GitHubRepo | null {
  const match = /^([^/]+)\/([^/#]+)(?:#\d+)?\/*$/.exec(input.replace(trailingPunctuation, ''))
  return match ? toGitHubRepo(match[1], match[2]) : null
}

function toGitHubRepo(owner: string, rawName: string): GitHubRepo | null {
  const name = rawName.endsWith('.git') ? rawName.slice(0, -4) : rawName

  if (!isValidOwner(owner) || !isValidRepoName(name)) {
    return null
  }

  return { owner, name }
}

function isValidOwner(owner: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(owner)
}

function isValidRepoName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && name !== '.' && name !== '..'
}
