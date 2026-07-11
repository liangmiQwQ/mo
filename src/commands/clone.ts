import { mkdir, readdir, rm, rmdir } from 'node:fs/promises'
import path from 'node:path'

import pc from 'picocolors'
import { x } from 'tinyexec'

import type { GlobalUserConfig } from '../utils/config.ts'
import { error as printError } from '../utils/error.ts'
import { success, startSpinner, stopSpinner, toTildePath } from '../utils/format.ts'
import { pathExists } from '../utils/fs.ts'
import { parseGitHubRepo } from '../utils/github.ts'

export async function runCloneCommand(repo: string, config: GlobalUserConfig): Promise<void> {
  const parsedRepo = parseGitHubRepo(repo)
  const ownerDir = path.join(config.root, parsedRepo.owner)
  const targetDir = path.join(ownerDir, parsedRepo.name)
  const ownerExisted = await pathExists(ownerDir)

  if (await pathExists(targetDir)) {
    printError(`Repository already exists at ${pc.cyan(toTildePath(targetDir))}`)
  }

  if (!ownerExisted) {
    await mkdir(ownerDir, { recursive: true })
  }

  const cloneUrl = `https://github.com/${parsedRepo.owner}/${parsedRepo.name}.git`
  const spinner = startSpinner(`Cloning ${pc.bold(`${parsedRepo.owner}/${parsedRepo.name}`)}...`)

  try {
    await runGitClone(cloneUrl, targetDir)
    stopSpinner(spinner)
    success(`Cloned ${pc.bold(`${parsedRepo.owner}/${parsedRepo.name}`)}`)
    console.log(`  ${pc.dim('→')} ${pc.cyan(toTildePath(targetDir))}`)
  } catch (error) {
    stopSpinner(spinner)
    await cleanupFailedClone(targetDir, ownerDir, ownerExisted)
    const details = error instanceof Error ? `: ${error.message}` : ''
    printError(`Git clone failed for ${parsedRepo.owner}/${parsedRepo.name}${details}`)
  }
}

async function cleanupFailedClone(
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
    // Cleanup best-effort only; keep original clone error as the main output.
  }
}

async function runGitClone(url: string, targetDir: string): Promise<void> {
  const result = await x('git', ['clone', '--progress', url, targetDir], {
    throwOnError: false
  })

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Git clone exited with code ${result.exitCode}`)
  }
}
