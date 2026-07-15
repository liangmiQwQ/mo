import { mkdir, readdir, rm, rmdir } from 'node:fs/promises'
import path from 'node:path'

import pc from 'picocolors'
import { x } from 'tinyexec'

import type { GlobalUserConfig } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { icons, startSpinner, stopSpinner, toTildePath } from '../utils/format.ts'
import { pathExists } from '../utils/fs.ts'
import { parseGitHubRepo } from '../utils/github.ts'
import { promptConfirm, promptText } from '../utils/prompt.ts'

export interface ForkOptions {
  org?: string
  name?: string
}

export async function runForkCommand(
  repo: string | undefined,
  config: GlobalUserConfig,
  options: ForkOptions
): Promise<void> {
  if (repo === undefined) {
    await runForkInPlace(config, options)
    return
  }

  const parsed = parseGitHubRepo(repo)

  // Q1: Would you like to fork to an organization? (skip if --org provided)
  const forkOrg = await resolveForkOrg(options.org)

  // Same owner with same name → immediate error before any prompts
  if (options.name !== undefined && forkOrg === parsed.owner && options.name === parsed.name) {
    error(`Cannot fork ${parsed.owner}/${parsed.name} to itself.`)
  }

  // Same owner → extra confirm before other prompts
  if (forkOrg === parsed.owner) {
    const ok = await promptConfirm(
      `Fork target has the same owner as the original (${pc.cyan(forkOrg)}). Continue?`,
      'sameOrgConfirm',
      { default: false }
    )
    if (!ok) {
      error('Fork canceled.', 78)
    }
  }

  // Q2: What is the repo name of the fork? (skip if --name provided)
  const forkName = await resolveForkName(parsed.name, parsed.owner, options.name)

  // After resolving name, check same org+name
  if (forkOrg === parsed.owner && forkName === parsed.name) {
    error(`Cannot fork ${parsed.owner}/${parsed.name} to itself.`)
  }

  const ownerDir = path.join(config.root, parsed.owner)
  const targetDir = path.join(ownerDir, parsed.name)
  const ownerExisted = await pathExists(ownerDir)

  if (await pathExists(targetDir)) {
    error(`Repository already exists at ${pc.cyan(toTildePath(targetDir))}`)
  }

  if (!ownerExisted) {
    await mkdir(ownerDir, { recursive: true })
  }

  const cloneUrl = `https://github.com/${parsed.owner}/${parsed.name}.git`
  const forkLabel = forkOrg ? `${forkOrg}/${forkName}` : forkName
  const spinner = startSpinner(
    `Cloning ${pc.bold(`${parsed.owner}/${parsed.name}`)} and forking to ${pc.bold(forkLabel)}...`
  )

  const cloneExec = x('git', ['clone', '--progress', cloneUrl, targetDir], { throwOnError: false })
  const ghArgs = buildGhForkArgs(parsed.owner, parsed.name, forkOrg, forkName)
  const forkExec = x('gh', ghArgs, { throwOnError: false })

  // If fork fails, kill the clone process
  forkExec.then(result => {
    if (result.exitCode !== 0) {
      cloneExec.process?.kill()
    }
    return result
  })

  const [cloneSettled, forkSettled] = await Promise.allSettled([cloneExec, forkExec])

  const forkResult = forkSettled.status === 'fulfilled' ? forkSettled.value : null
  const cloneResult = cloneSettled.status === 'fulfilled' ? cloneSettled.value : null

  const forkFailed = forkSettled.status === 'rejected' || (forkResult?.exitCode ?? 1) !== 0
  const cloneFailed = cloneSettled.status === 'rejected' || (cloneResult?.exitCode ?? 1) !== 0

  if (forkFailed) {
    stopSpinner(spinner)
    await cleanupClone(targetDir, ownerDir, ownerExisted)
    const details =
      forkSettled.status === 'rejected'
        ? String(forkSettled.reason)
        : getErrorDetails(forkResult?.stderr, `gh fork exited with code ${forkResult?.exitCode}`)
    error(`Fork failed for ${forkLabel}: ${details}`)
  }

  if (cloneFailed) {
    stopSpinner(spinner)
    await cleanupClone(targetDir, ownerDir, ownerExisted)
    console.log(
      `${icons.warning} ${pc.yellow(`Fork created at ${pc.bold(forkLabel)} but clone failed.`)}`
    )
    const details =
      cloneSettled.status === 'rejected'
        ? String(cloneSettled.reason)
        : getErrorDetails(
            cloneResult?.stderr,
            `git clone exited with code ${cloneResult?.exitCode}`
          )
    error(`Clone failed for ${parsed.owner}/${parsed.name}: ${details}`)
  }

  const effectiveOrg = forkOrg ?? (await getGhAuthUser())
  await configureRemotes(targetDir, parsed.owner, parsed.name, effectiveOrg, forkName)
  stopSpinner(spinner)

  printRemotes(parsed.owner, parsed.name, effectiveOrg, forkName)
  console.log(`  ${pc.dim('→')} ${pc.cyan(toTildePath(targetDir))}`)
}

async function runForkInPlace(config: GlobalUserConfig, options: ForkOptions): Promise<void> {
  const cwd = process.cwd()
  const detected = detectManagedRepo(config.root, cwd)
  if (!detected) {
    error('Current directory is not a mo-managed repository.')
  }

  const hasUpstream = await checkRemoteExists(cwd, 'upstream')
  if (hasUpstream) {
    error('Repository already has an "upstream" remote. It may already be a fork.')
  }

  const originUrl = await getRemoteUrl(cwd, 'origin')
  if (!originUrl) {
    error('No "origin" remote found in current repository.')
  }

  // Q1: Would you like to fork to an organization? (skip if --org provided)
  const forkOrg = await resolveForkOrg(options.org)

  if (options.name !== undefined && forkOrg === detected.owner && options.name === detected.name) {
    error(`Cannot fork ${detected.owner}/${detected.name} to itself.`)
  }

  if (forkOrg === detected.owner) {
    const ok = await promptConfirm(
      `Fork target has the same owner as the original (${pc.cyan(forkOrg)}). Continue?`,
      'sameOrgConfirm',
      { default: false }
    )
    if (!ok) {
      error('Fork canceled.', 78)
    }
  }

  // Q2: What is the repo name of the fork? (skip if --name provided)
  const forkName = await resolveForkName(detected.name, detected.owner, options.name)

  if (forkOrg === detected.owner && forkName === detected.name) {
    error(`Cannot fork ${detected.owner}/${detected.name} to itself.`)
  }

  const forkLabel = forkOrg ? `${forkOrg}/${forkName}` : forkName
  const spinner = startSpinner(`Forking to ${pc.bold(forkLabel)}...`)
  const ghArgs = buildGhForkArgs(detected.owner, detected.name, forkOrg, forkName)
  const result = await x('gh', ghArgs, { throwOnError: false })

  if (result.exitCode !== 0) {
    stopSpinner(spinner)
    error(`Fork failed: ${result.stderr || `gh fork exited with code ${result.exitCode}`}`)
  }

  const effectiveOrg = forkOrg ?? (await getGhAuthUser())
  await configureRemotes(cwd, detected.owner, detected.name, effectiveOrg, forkName)
  stopSpinner(spinner)
  printRemotes(detected.owner, detected.name, effectiveOrg, forkName)
}

async function resolveForkName(
  originalName: string,
  originalOwner: string,
  nameOption: string | undefined
): Promise<string> {
  if (nameOption) {
    return nameOption
  }

  const choice1 = originalName
  const choice2 = `${originalOwner}-${originalName}`

  const input = await promptText(
    `Fork repo name? (suggestions: ${pc.cyan(choice1)}, ${pc.cyan(choice2)})`,
    'forkName',
    { initial: choice1 }
  )

  const trimmed = input.trim()
  if (!trimmed) {
    error('Fork repo name cannot be empty.', 78)
  }
  return trimmed
}

async function resolveForkOrg(orgOption: string | undefined): Promise<string | undefined> {
  if (orgOption) {
    return orgOption
  }

  const wantsOrg = await promptConfirm(
    'Would you like to fork to an organization?',
    'wantsForkOrg',
    { default: false }
  )

  if (!wantsOrg) {
    return undefined
  }

  const input = await promptText('Organization name:', 'forkOrg')
  const trimmed = input.trim()
  if (!trimmed) {
    error('Organization name cannot be empty.', 78)
  }
  return trimmed
}

function buildGhForkArgs(
  originalOwner: string,
  originalName: string,
  forkOrg: string | undefined,
  forkName: string
): string[] {
  const args = ['repo', 'fork', `${originalOwner}/${originalName}`, '--clone=false']
  if (forkName !== originalName) {
    args.push('--fork-name', forkName)
  }
  if (forkOrg) {
    args.push('--org', forkOrg)
  }
  return args
}

async function getGhAuthUser(): Promise<string> {
  const result = await x('gh', ['api', 'user', '--jq', '.login'], { throwOnError: false })
  if (result.exitCode !== 0) {
    error('Failed to get GitHub authenticated user.')
  }
  return result.stdout.trim()
}

async function configureRemotes(
  dir: string,
  originalOwner: string,
  originalName: string,
  forkOrg: string,
  forkName: string
): Promise<void> {
  const run = (cmd: string, args: string[]) =>
    x(cmd, args, { throwOnError: false, nodeOptions: { cwd: dir } })

  await run('git', ['remote', 'rename', 'origin', 'upstream'])
  await run('git', ['remote', 'add', 'origin', `https://github.com/${forkOrg}/${forkName}.git`])

  const branchResult = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  const defaultBranch = branchResult.stdout.trim() || 'main'

  await run('git', ['branch', '--set-upstream-to', `upstream/${defaultBranch}`])
}

function printRemotes(
  originalOwner: string,
  originalName: string,
  forkOrg: string,
  forkName: string
): void {
  console.log(
    `  ${pc.dim('upstream')} → ${pc.cyan(`https://github.com/${originalOwner}/${originalName}.git`)}`
  )
  console.log(
    `  ${pc.dim('origin')}   → ${pc.cyan(`https://github.com/${forkOrg}/${forkName}.git`)}`
  )
}

async function cleanupClone(
  targetDir: string,
  ownerDir: string,
  ownerExisted: boolean
): Promise<void> {
  try {
    if (await pathExists(targetDir)) {
      await rm(targetDir, { recursive: true, force: true })
    }
    if (!ownerExisted && (await pathExists(ownerDir)) && (await readdir(ownerDir)).length === 0) {
      await rmdir(ownerDir)
    }
  } catch {
    // Best-effort cleanup
  }
}

function getErrorDetails(stderr: string | undefined, fallback: string): string {
  if (stderr) {
    return stderr
  }
  return fallback
}

function detectManagedRepo(root: string, cwd: string): { owner: string; name: string } | null {
  const { sep } = path
  if (!cwd.startsWith(root + sep)) {
    return null
  }
  const relative = path.relative(root, cwd)
  const parts = relative.split(sep)
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return null
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

async function getRemoteUrl(dir: string, remoteName: string): Promise<string | null> {
  const result = await x('git', ['remote', 'get-url', remoteName], {
    throwOnError: false,
    nodeOptions: { cwd: dir }
  })
  if (result.exitCode !== 0) {
    return null
  }
  return result.stdout.trim() || null
}
