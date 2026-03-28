import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { exec } from '../utils'

const TEMP_DIR = path.resolve(__dirname, '../.temp/list')

beforeEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true })
  }
  mkdirSync(TEMP_DIR, { recursive: true })
})

afterEach(() => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true })
  }
})

describe('ghm list', () => {
  test('list shows empty state', async () => {
    const tempDir = createTempDir()
    const rootDir = path.join(tempDir, 'code')
    mkdirSync(rootDir, { recursive: true })
    const configPath = createConfig(tempDir, rootDir)

    const result = await exec(['-c', configPath, 'list'])

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

    const result = await exec(['-c', configPath, 'list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim().split('\n')).toEqual(['vitejs/vite', 'vuejs/core', 'vuejs/router'])
  })
})

let testCounter = 0

function createTempDir(): string {
  const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_') || 'test'
  const tempDir = path.join(TEMP_DIR, `${Date.now()}_${testCounter++}_${testName}`)
  mkdirSync(tempDir, { recursive: true })
  return tempDir
}

function createConfig(tempDir: string, rootDir: string): string {
  const configPath = path.join(tempDir, 'ghmrc.json')
  writeFileSync(configPath, JSON.stringify({ root: rootDir }, null, 2), 'utf8')
  return configPath
}
