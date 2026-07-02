import { error } from './error.ts'

export interface GitHubRepo {
  owner: string
  name: string
}

export function parseGitHubRepo(input: string): GitHubRepo {
  const repo = parseGitHubRepoInput(input)

  if (!repo) {
    error('Invalid repository format. Use <owner>/<repo> or a GitHub repository URL.')
  }

  return repo
}

export function parseGitHubRepoInput(input: string): GitHubRepo | null {
  return parseRepoInput(input.trim())
}

function parseRepoInput(input: string): GitHubRepo | null {
  if (!input) {
    return null
  }

  const urlRepo = parseGitHubUrl(input)
  if (urlRepo) {
    return urlRepo
  }

  return parseGitHubPath(input)
}

function parseGitHubUrl(input: string): GitHubRepo | null {
  if (!input.includes('://')) {
    return null
  }

  let url: URL

  try {
    url = new URL(input.startsWith('git+') ? input.slice(4) : input)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (host !== 'github.com' && host !== 'www.github.com') {
    return null
  }

  return parseGitHubPath(url.pathname)
}

function parseGitHubPath(input: string): GitHubRepo | null {
  const parts = input.replaceAll(/^\/+|\/+$/g, '').split('/')
  if (parts.length !== 2) {
    return null
  }

  const [owner, rawName] = parts
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
  return /^[A-Za-z0-9._-]+$/.test(name)
}
