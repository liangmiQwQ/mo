import path from 'node:path'
import fs from 'node:fs/promises'
import { x } from 'tinyexec'

export type ExecResult = {
  stdout: string
  stderr: string
  exitCode: number | undefined
}

export const tempDir = path.join(import.meta.dirname, 'fixtures/.temp')

export async function exec(
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; skipCleanup?: boolean } = {},
) {
  // Clean temp dir unless skipCleanup is true
  if (!options.skipCleanup) {
    await fs.rm(tempDir, { recursive: true, force: true })
    await fs.mkdir(tempDir, { recursive: true })
  }

  const cwd = options.cwd ?? process.cwd()
  const env = options.env ? { ...process.env, ...options.env } : process.env

  const cli = path.resolve(import.meta.dirname, '../bin/cli.mjs')

  const output = await x('node', [cli, ...args], {
    throwOnError: false,
    nodeOptions: {
      cwd,
      env,
    },
  })

  return {
    stdout: output.stdout,
    stderr: output.stderr,
    exitCode: output.exitCode,
  }
}

export function execWithConfig(
  args: string[],
  configPath: string,
  options: { cwd?: string; env?: NodeJS.ProcessEnv; skipCleanup?: boolean } = {},
) {
  return exec(['--config', configPath, ...args], options)
}

export function execFixture(name: string, args: string[], options: { skipCleanup?: boolean } = {}) {
  const cwd = path.join(import.meta.dirname, 'fixtures', name)
  const configPath = path.join(cwd, 'ghmrc.json')
  return execWithConfig(args, configPath, { cwd, ...options })
}

// Helper functions for setting up test repositories
export async function setupTestRepo(
  baseDir: string,
  owner: string,
  repo: string,
  remoteUrl: string,
): Promise<void> {
  const repoPath = path.join(baseDir, owner, repo)
  await fs.mkdir(repoPath, { recursive: true })

  // Initialize git repo
  await execGit(['init'], repoPath)
  await execGit(['remote', 'add', 'origin', remoteUrl], repoPath)
}

export async function setupNotAGitDir(baseDir: string, owner: string, name: string): Promise<void> {
  const dirPath = path.join(baseDir, owner, name)
  await fs.mkdir(dirPath, { recursive: true })
  // Just create a file, no .git directory
  await fs.writeFile(path.join(dirPath, 'README.md'), '# Not a repo')
}

export async function setupNonGitHubRepo(
  baseDir: string,
  owner: string,
  repo: string,
): Promise<void> {
  const repoPath = path.join(baseDir, owner, repo)
  await fs.mkdir(repoPath, { recursive: true })

  await execGit(['init'], repoPath)
  await execGit(['remote', 'add', 'origin', 'https://gitlab.com/user/repo.git'], repoPath)
}

async function execGit(args: string[], cwd: string): Promise<void> {
  const result = await x('git', args, {
    throwOnError: false,
    nodeOptions: { cwd },
  })
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  }
}

// Helper to strip ANSI codes for testing
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '')
}
