import { describe, expect, test } from 'vitest'
import {
  buildManagedShellrcBlock,
  resolveShellRcPath,
  upsertManagedShellrcBlock,
  GHM_START_MARKER,
  GHM_END_MARKER,
} from '../src/shell/shellrc'

describe('shellrc utils', () => {
  test('resolves shellrc path for each supported shell', () => {
    const home = '/tmp/demo-home'

    expect(resolveShellRcPath('zsh', home)).toBe('/tmp/demo-home/.zshrc')
    expect(resolveShellRcPath('bash', home)).toBe('/tmp/demo-home/.bashrc')
    expect(resolveShellRcPath('fish', home)).toBe('/tmp/demo-home/.config/fish/config.fish')
  })

  test('inserts managed block into content without block', () => {
    const block = buildManagedShellrcBlock('bash', 'ghm')
    const output = upsertManagedShellrcBlock('export PATH="$PATH:/custom/bin"\n', block)

    expect(output).toContain('export PATH="$PATH:/custom/bin"')
    expect(output).toContain(GHM_START_MARKER)
    expect(output).toContain('source <(ghm shell bash)')
    expect(output).toContain(GHM_END_MARKER)
  })

  test('replaces existing managed block', () => {
    const block = buildManagedShellrcBlock('zsh', 'ghm')
    const initial = [
      'export TEST=1',
      GHM_START_MARKER,
      'echo "old value"',
      GHM_END_MARKER,
      'alias ll="ls -la"',
    ].join('\n')

    const output = upsertManagedShellrcBlock(initial, block)

    expect(output).toContain('export TEST=1')
    expect(output).toContain('alias ll="ls -la"')
    expect(output).toContain('source <(ghm shell zsh)')
    expect(output).not.toContain('echo "old value"')
    expect(output.match(new RegExp(`^${escapeRegex(GHM_START_MARKER)}$`, 'gm'))).toHaveLength(1)
  })

  test('is idempotent on repeated upsert', () => {
    const block = buildManagedShellrcBlock('fish', 'ghm')
    const first = upsertManagedShellrcBlock('alias g="git"\n', block)
    const second = upsertManagedShellrcBlock(first, block)

    expect(second).toBe(first)
    expect(second.match(new RegExp(`^${escapeRegex(GHM_START_MARKER)}$`, 'gm'))).toHaveLength(1)
    expect(second.match(new RegExp(`^${escapeRegex(GHM_END_MARKER)}$`, 'gm'))).toHaveLength(1)
  })
})

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
