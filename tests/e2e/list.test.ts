import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  execFixture,
  setupTestRepo,
  setupNotAGitDir,
  setupNonGitHubRepo,
  stripAnsi,
} from '../utils'

const fixtureDir = path.join(import.meta.dirname, '../fixtures/list-command')
const rootDir = path.join(fixtureDir, 'root')

describe('ghm list', () => {
  beforeEach(async () => {
    // Clean up and create fresh root directory
    await fs.rm(rootDir, { recursive: true, force: true })
    await fs.mkdir(rootDir, { recursive: true })

    // Set up test repositories
    // vitejs/vite - GitHub repo
    await setupTestRepo(rootDir, 'vitejs', 'vite', 'https://github.com/vitejs/vite.git')

    // vuejs/core - GitHub repo
    await setupTestRepo(rootDir, 'vuejs', 'core', 'https://github.com/vuejs/core.git')

    // vuejs/router - GitHub repo
    await setupTestRepo(rootDir, 'vuejs', 'router', 'https://github.com/vuejs/router.git')

    // vitejs/no-github-remote - Non-GitHub repo (should be filtered out)
    await setupNonGitHubRepo(rootDir, 'vitejs', 'no-github-remote')

    // vitejs/not-a-repo - Not a git directory (should be filtered out)
    await setupNotAGitDir(rootDir, 'vitejs', 'not-a-repo')
  })

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true })
  })

  test('lists all repositories in root directory', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('vitejs')
    expect(result.stdout).toContain('vite')
    expect(result.stdout).toContain('vuejs')
    expect(result.stdout).toContain('core')
    expect(result.stdout).toContain('router')
  })

  test('lists repositories in sorted order', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    const lines = result.stdout.trim().split('\n').filter(Boolean)

    // Check that vitejs appears before vuejs (alphabetical order)
    const vitejsIndex = lines.findIndex((line) => line.includes('vitejs'))
    const vuejsIndex = lines.findIndex((line) => line.includes('vuejs'))
    expect(vitejsIndex).toBeLessThan(vuejsIndex)

    // Check that repos under vuejs are sorted (core comes before router)
    const coreIndex = lines.findIndex((line) => line.includes('core'))
    const routerIndex = lines.findIndex((line) => line.includes('router'))
    expect(coreIndex).toBeLessThan(routerIndex)
  })

  test('shows repository count summary', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    expect(stripAnsi(result.stdout)).toContain('3 repositories')
    expect(stripAnsi(result.stdout)).toContain('2 organizations')
  })

  test('filters out non-git directories', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    // Should not show directories that are not git repos
    expect(result.stdout).not.toContain('not-a-repo')
  })

  test('filters out repos without GitHub remotes', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    // Should not show repos that don't have GitHub remotes
    expect(result.stdout).not.toContain('no-github-remote')
  })
})
