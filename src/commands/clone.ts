import { existsSync, mkdirSync, readdirSync, rmSync, rmdirSync } from 'node:fs'
import path from 'node:path'
import { x } from 'tinyexec'
import pc from 'picocolors'
import type { GlobalUserConfig } from '../utils/config'
import { error } from '../utils/error'
import { success, startSpinner, stopSpinner, toTildePath } from '../utils/format'

export async function runCloneCommand(repo: string, config: GlobalUserConfig): Promise<void> {
  const parsedRepo = parseRepo(repo)
  const ownerDir = path.join(config.root, parsedRepo.owner)
  const targetDir = path.join(ownerDir, parsedRepo.name)
  const ownerExisted = existsSync(ownerDir)

  if (existsSync(targetDir)) {
    error(`Repository already exists at ${pc.cyan(toTildePath(targetDir))}`)
  }

  if (!ownerExisted) {
    mkdirSync(ownerDir, { recursive: true })
  }

  const cloneUrl = `https://github.com/${parsedRepo.owner}/${parsedRepo.name}.git`
  const spinner = startSpinner(`Cloning ${pc.bold(`${parsedRepo.owner}/${parsedRepo.name}`)}...`)

  try {
    await runGitClone(cloneUrl, targetDir)
    stopSpinner(spinner)
    success(`Cloned ${pc.bold(`${parsedRepo.owner}/${parsedRepo.name}`)}`)
    console.log(`  ${pc.dim('→')} ${pc.cyan(toTildePath(targetDir))}`)
  } catch (err) {
    stopSpinner(spinner)
    cleanupFailedClone(targetDir, ownerDir, ownerExisted)
    const details = err instanceof Error ? `: ${err.message}` : ''
    error(`Git clone failed for ${parsedRepo.owner}/${parsedRepo.name}${details}`)
  }
}

function cleanupFailedClone(targetDir: string, ownerDir: string, ownerExisted: boolean): void {
  try {
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true })
    }

    if (!ownerExisted && existsSync(ownerDir) && readdirSync(ownerDir).length === 0) {
      rmdirSync(ownerDir)
    }
  } catch {
    // Cleanup best-effort only; keep original clone error as the main output.
  }
}

async function runGitClone(url: string, targetDir: string): Promise<void> {
  const result = await x('git', ['clone', '--progress', url, targetDir], {
    throwOnError: false,
  })

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Git clone exited with code ${result.exitCode}`)
  }
}

function parseRepo(repo: string): { owner: string; name: string } {
  const match = repo.match(/^([^/]+)\/([^/]+)$/)

  if (!match) {
    error('Invalid repository format. Use <owner>/<repo>.')
  }

  return {
    owner: match[1],
    name: match[2],
  }
}
