import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import { execNode } from '../exec'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
  tempDirs.length = 0
})

describe('ghm stage one', () => {
  test('--config loads custom config path', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')
    mkdirSync(path.join(rootDir, 'vitejs', 'vite'), { recursive: true })
    const configPath = createConfig(tempDir, rootDir)

    const result = await execNode(['bin/cli.mjs', '--config', configPath, 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('vitejs/vite')
  })

  test('--config reports missing file', async () => {
    const result = await execNode(['bin/cli.mjs', '--config', '/path/not-found/ghm.jsonc', 'list'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain(`Couldn't find config file`)
  })

  test('clone creates <root>/<owner>/<repo>', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')
    mkdirSync(rootDir, { recursive: true })
    const configPath = createConfig(tempDir, rootDir)
    const fakeGitDir = createFakeGit(tempDir)

    const result = await execNode(['bin/cli.mjs', '-c', configPath, 'clone', 'vitejs/devtools'], {
      env: {
        PATH: `${fakeGitDir}${path.delimiter}${process.env.PATH || ''}`,
      },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Cloned vitejs/devtools')

    const listResult = await execNode(['bin/cli.mjs', '-c', configPath, 'list'])
    expect(listResult.stdout.trim()).toBe('vitejs/devtools')
  })

  test('clone rejects invalid repo format', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')
    mkdirSync(rootDir, { recursive: true })
    const configPath = createConfig(tempDir, rootDir)

    const result = await execNode(['bin/cli.mjs', '-c', configPath, 'clone', 'vitejs'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Invalid repository format')
  })

  test('clone errors when target exists', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')
    mkdirSync(path.join(rootDir, 'vitejs', 'devtools'), { recursive: true })
    const configPath = createConfig(tempDir, rootDir)

    const result = await execNode(['bin/cli.mjs', '-c', configPath, 'clone', 'vitejs/devtools'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Repository already exists')
  })

  test('list shows empty state', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')
    mkdirSync(rootDir, { recursive: true })
    const configPath = createConfig(tempDir, rootDir)

    const result = await execNode(['bin/cli.mjs', '-c', configPath, 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No repositories found')
  })

  test('list outputs sorted owner/repo pairs', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')

    mkdirSync(path.join(rootDir, 'vuejs', 'core'), { recursive: true })
    mkdirSync(path.join(rootDir, 'vitejs', 'vite'), { recursive: true })
    mkdirSync(path.join(rootDir, 'vuejs', 'router'), { recursive: true })

    const configPath = createConfig(tempDir, rootDir)

    const result = await execNode(['bin/cli.mjs', '-c', configPath, 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim().split('\n')).toEqual(['vitejs/vite', 'vuejs/core', 'vuejs/router'])
  })
})

function createTempDir(): string {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ghm-e2e-'))
  tempDirs.push(tempDir)
  return tempDir
}

function createConfig(tempDir: string, rootDir: string): string {
  const configPath = path.join(tempDir, 'ghm.jsonc')
  writeFileSync(configPath, JSON.stringify({ root: rootDir }, null, 2), 'utf8')
  return configPath
}

function createFakeGit(tempDir: string): string {
  const fakeGitDir = path.join(tempDir, 'bin')
  const fakeGitPath = path.join(fakeGitDir, 'git')

  mkdirSync(fakeGitDir, { recursive: true })
  writeFileSync(
    fakeGitPath,
    '#!/bin/sh\nif [ "$1" = "clone" ]; then\n  mkdir -p "$3"\n  exit 0\nfi\nexit 1\n',
    'utf8',
  )
  chmodSync(fakeGitPath, 0o755)

  return fakeGitDir
}
