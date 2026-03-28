import path from 'node:path'
import fs from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { execFixture, stripAnsi } from '../utils'
import { GHM_END_MARKER, GHM_START_MARKER } from '../../src/shell/shellrc'

const tempDir = path.join(import.meta.dirname, '../fixtures/.temp')

describe('shellrc runtime sync', () => {
  beforeEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test('syncs zshrc managed block on each run without duplication', async () => {
    const homeDir = path.join(tempDir, 'home-zsh')
    await fs.mkdir(homeDir, { recursive: true })

    const first = await execFixture('shellrc-sync', ['list'], {
      env: { HOME: homeDir },
      skipCleanup: true,
    })
    expect(first.exitCode).toBe(0)

    const zshrc = path.join(homeDir, '.zshrc')
    const firstContent = await fs.readFile(zshrc, 'utf8')
    expect(firstContent).toContain(GHM_START_MARKER)
    expect(firstContent).toContain('echo "hello world from ghm"')
    expect(firstContent).toContain(GHM_END_MARKER)

    const second = await execFixture('shellrc-sync', ['list'], {
      env: { HOME: homeDir },
      skipCleanup: true,
    })
    expect(second.exitCode).toBe(0)

    const secondContent = await fs.readFile(zshrc, 'utf8')
    expect(
      secondContent.match(new RegExp(`^${escapeRegex(GHM_START_MARKER)}$`, 'gm')),
    ).toHaveLength(1)
    expect(secondContent.match(new RegExp(`^${escapeRegex(GHM_END_MARKER)}$`, 'gm'))).toHaveLength(
      1,
    )
  })

  test('errors when shells is not configured', async () => {
    const homeDir = path.join(tempDir, 'home-no-shells')
    await fs.mkdir(homeDir, { recursive: true })

    const first = await execFixture('shellrc-missing-shells', ['list'], {
      env: { HOME: homeDir },
      skipCleanup: true,
    })

    expect(first.exitCode).toBe(1)
    expect(stripAnsi(first.stderr)).toContain(
      'Invalid config: "shells" must be provided with at least one shell',
    )
  })
})

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
