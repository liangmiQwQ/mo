import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFixture, setupTestRepo, stripAnsi } from '../utils'

const fixtureDir = path.join(import.meta.dirname, '../fixtures/clone-command')
const tempDir = path.join(fixtureDir, '../.temp')

describe('ghm clone', () => {
  beforeEach(async () => {
    // Clean up temp directories for clone tests
    await fs.rm(tempDir, { recursive: true, force: true })
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test('errors on invalid repository format', async () => {
    const result = await execFixture('clone-command', ['clone', 'invalid-repo'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Invalid repository format')
  })

  test('errors when repository already exists', async () => {
    // Create the repo directly in temp
    // The ghmrc points to ../.temp/existing-root, so we create there
    const rootDir = path.join(tempDir, 'existing-root')
    await fs.mkdir(rootDir, { recursive: true })
    await setupTestRepo(rootDir, 'vuejs', 'core', 'https://github.com/vuejs/core.git')

    // Use skipCleanup to prevent exec() from removing our test repo
    const result = await execFixture('clone-existing-repo', ['clone', 'vuejs/core'], {
      skipCleanup: true,
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Repository already exists')
  })

  test('shows help for clone command', async () => {
    const result = await execFixture('clone-command', ['clone', '--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('clone')
  })

  test('successfully clones a repository', async () => {
    const result = await execFixture('clone-command', ['clone', 'octocat/Hello-World'])

    expect(result.exitCode).toBe(0)
    expect(stripAnsi(result.stdout)).toContain('Cloned octocat/Hello-World')

    // Verify the repository was actually cloned to disk
    const stats = await fs.stat(path.join(tempDir, 'octocat/Hello-World'))
    expect(stats.isDirectory()).toBe(true)

    // Verify it has expected files (README should exist)
    const readmePath = path.join(tempDir, 'octocat/Hello-World/README')
    const readmeExists = await fs
      .access(readmePath)
      .then(() => true)
      .catch(() => false)
    expect(readmeExists).toBe(true)
  }, 30000) // 30 second timeout for network operation
})
