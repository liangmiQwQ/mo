import { describe, expect, test } from 'vitest'
import { execFixture, stripAnsi } from '../utils'

describe('ghm shell command', () => {
  test('outputs bash integration', async () => {
    const result = await execFixture('shell-cmd', ['shell', 'bash'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('ghm shell bash')
    expect(result.stdout).toContain('export GHM_SHELL_LOADED=1')
    expect(result.stdout).toContain('hello world from ghm')
  })

  test('outputs zsh integration', async () => {
    const result = await execFixture('shell-cmd', ['shell', 'zsh'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('ghm shell zsh')
    expect(result.stdout).toContain('export GHM_SHELL_LOADED=1')
    expect(result.stdout).toContain('hello world from ghm')
  })

  test('outputs fish integration', async () => {
    const result = await execFixture('shell-cmd', ['shell', 'fish'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('ghm shell fish')
    expect(result.stdout).toContain('set -gx GHM_SHELL_LOADED 1')
    expect(result.stdout).toContain('hello world from ghm')
  })

  test('errors on invalid shell', async () => {
    const result = await execFixture('shell-cmd', ['shell', 'invalid'])
    expect(result.exitCode).toBe(1)
    expect(stripAnsi(result.stderr)).toContain('Invalid shell')
    expect(stripAnsi(result.stderr)).toContain('bash')
    expect(stripAnsi(result.stderr)).toContain('zsh')
    expect(stripAnsi(result.stderr)).toContain('fish')
  })

  test('errors when shell is not enabled in config', async () => {
    const result = await execFixture('shell-disabled', ['shell', 'bash'])
    expect(result.exitCode).toBe(1)
    expect(stripAnsi(result.stderr)).toContain(
      'Shell "bash" is not enabled in config "shells". Enabled: zsh',
    )
  })

  test('exits with code 2 when GHM_SHELL_LOADED is set', async () => {
    const result = await execFixture('shell-cmd', ['shell', 'bash'], {
      env: { GHM_SHELL_LOADED: '1' },
    })
    expect(result.exitCode).toBe(2)
  })
})
