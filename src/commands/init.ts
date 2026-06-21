import { existsSync } from 'node:fs'
import path from 'node:path'

import pc from 'picocolors'
import { x } from 'tinyexec'

import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { icons, startSpinner, stopSpinner, success, toTildePath } from '../utils/format.ts'
import { promptConfirm } from '../utils/prompt.ts'

export interface InitOptions {
  public?: boolean
  private?: boolean
  push?: boolean
}

export async function runInitCommand(
  config: GlobalUserConfig,
  options: InitOptions
): Promise<void> {
  const cwd = process.cwd()

  // Validate location and extract repo info
  const repoInfo = validateMoStructure(config.root, cwd)

  // Check existing state
  const gitDir = path.join(cwd, '.git')
  const hasGit = existsSync(gitDir)

  if (hasGit) {
    const hasOrigin = await checkRemoteExists(cwd, 'origin')
    if (hasOrigin) {
      error(
        `Repository already has "origin" remote configured. Use ${pc.cyan('mo fork')} for fork workflows.`
      )
    }
  }

  // Get authenticated GitHub user
  const ghUser = await getGhAuthUser()

  // Determine if this is an org repo
  const isOrg = repoInfo.owner !== ghUser

  // Resolve visibility
  const isPublic = await resolveVisibility(options)

  // Initialize git if needed
  if (!hasGit) {
    const initResult = await x('git', ['init'], { throwOnError: false, nodeOptions: { cwd } })
    if (initResult.exitCode !== 0) {
      error(`Git init failed: ${initResult.stderr || `exited with code ${initResult.exitCode}`}`)
    }
  }

  // Build gh repo create args
  const ghArgs = buildGhCreateArgs(repoInfo.name, repoInfo.owner, isOrg, isPublic)
  const repoFullName = `${repoInfo.owner}/${repoInfo.name}`

  const spinner = startSpinner(`Creating GitHub repository ${pc.bold(repoFullName)}...`)
  const createResult = await x('gh', ghArgs, { throwOnError: false, nodeOptions: { cwd } })
  stopSpinner(spinner)

  if (createResult.exitCode !== 0) {
    const stderr = createResult.stderr || ''
    if (stderr.includes('already exists')) {
      error(
        `Repository ${pc.cyan(repoFullName)} already exists on GitHub. Use ${pc.cyan('mo clone')} instead.`
      )
    }
    if (stderr.includes('Could not resolve to an Organization') || stderr.includes('not an org')) {
      error(`Failed to create repository: ${stderr}`)
    }
    error(
      `Failed to create repository: ${stderr || `gh exited with code ${createResult.exitCode}`}`
    )
  }

  const repoUrl = `https://github.com/${repoFullName}`
  success(`Created ${pc.bold(repoFullName)}`)
  console.log(`  ${pc.dim('→')} ${pc.cyan(repoUrl)}`)

  // Push if requested
  if (options.push) {
    await pushCurrentBranch(cwd)
  }
}

function validateMoStructure(root: string, cwd: string): { owner: string; name: string } {
  const { sep } = path

  // Check if cwd is under root
  if (!cwd.startsWith(root + sep) && cwd !== root) {
    error(
      `Current directory is not under mo root.\n` +
        `  Expected: ${pc.cyan(`${toTildePath(root)}/<owner>/<repo>`)}\n` +
        `  Current:  ${pc.cyan(toTildePath(cwd))}`
    )
  }

  const relative = path.relative(root, cwd)
  const parts = relative.split(sep).filter(Boolean)

  if (parts.length < 2) {
    error(
      `Current directory is not in mo structure.\n` +
        `  Expected: ${pc.cyan(`${toTildePath(root)}/<owner>/<repo>`)}\n` +
        `  Current:  ${pc.cyan(toTildePath(cwd))}`
    )
  }

  if (parts.length > 2) {
    const repoRoot = path.join(root, parts[0], parts[1])
    error(
      `Current directory is nested too deep.\n` +
        `  Run from repository root: ${pc.cyan(toTildePath(repoRoot))}`
    )
  }

  return { owner: parts[0], name: parts[1] }
}

async function checkRemoteExists(dir: string, remoteName: string): Promise<boolean> {
  const result = await x('git', ['remote'], { throwOnError: false, nodeOptions: { cwd: dir } })
  return result.stdout
    .split('\n')
    .map(s => s.trim())
    .includes(remoteName)
}

async function getGhAuthUser(): Promise<string> {
  const result = await x('gh', ['api', 'user', '--jq', '.login'], { throwOnError: false })
  if (result.exitCode !== 0) {
    error('Failed to get GitHub authenticated user. Run `gh auth login` first.')
  }
  return result.stdout.trim()
}

async function resolveVisibility(options: InitOptions): Promise<boolean> {
  if (options.public) {
    return true
  }
  if (options.private) {
    return false
  }

  return promptConfirm('Create as public repository?', 'visibility', { default: true })
}

function buildGhCreateArgs(
  name: string,
  owner: string,
  isOrg: boolean,
  isPublic: boolean
): string[] {
  const repoArg = isOrg ? `${owner}/${name}` : name
  return [
    'repo',
    'create',
    repoArg,
    '--source=.',
    '--remote=origin',
    isPublic ? '--public' : '--private'
  ]
}

async function pushCurrentBranch(dir: string): Promise<void> {
  const branchResult = await x('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    throwOnError: false,
    nodeOptions: { cwd: dir }
  })
  const branch = branchResult.stdout.trim() || 'main'

  const spinner = startSpinner(`Pushing to ${pc.bold(branch)}...`)
  const pushResult = await x('git', ['push', '-u', 'origin', branch], {
    throwOnError: false,
    nodeOptions: { cwd: dir }
  })
  stopSpinner(spinner)

  if (pushResult.exitCode !== 0) {
    console.log(
      `  ${icons.warning} ${pc.yellow(`Push failed: ${pushResult.stderr || `exited with code ${pushResult.exitCode}`}`)}`
    )
    return
  }

  console.log(`  ${pc.dim('↑')} Pushed to ${pc.cyan(`origin/${branch}`)}`)
}
