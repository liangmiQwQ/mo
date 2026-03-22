import { GhmError } from './error.js'

export type RepoSpec = {
  owner: string
  repo: string
}

export function parseRepoSpec(spec: string): RepoSpec {
  const trimmed = spec.trim()
  if (!trimmed) throw new GhmError('Missing repo spec: <owner>/<repo>', 2)

  const parts = trimmed.split('/')
  if (parts.length !== 2) throw new GhmError(`Invalid repo spec: ${spec}`, 2)

  const owner = parts[0]?.trim()
  let repo = parts[1]?.trim()

  if (!owner || !repo) throw new GhmError(`Invalid repo spec: ${spec}`, 2)
  if (repo.endsWith('.git')) repo = repo.slice(0, -4)
  if (!repo) throw new GhmError(`Invalid repo spec: ${spec}`, 2)

  return { owner, repo }
}
