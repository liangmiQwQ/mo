import { describe, expect, test } from 'vitest'
import { execFixture } from '../utils'

describe('ghm list', () => {
  test('lists all repositories in root directory', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('vitejs/vite')
    expect(result.stdout).toContain('vuejs/core')
    expect(result.stdout).toContain('vuejs/router')
  })

  test('lists repositories in sorted order', async () => {
    const result = await execFixture('list-command', ['list'])

    expect(result.exitCode).toBe(0)
    const lines = result.stdout.trim().split('\n').filter(Boolean)
    expect(lines).toEqual(['vitejs/vite', 'vuejs/core', 'vuejs/router'])
  })
})
