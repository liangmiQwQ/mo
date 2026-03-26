import { describe, expect, test } from 'vitest'

import { execNode } from '../exec'

describe('ghm cli', () => {
  test('--version', async () => {
    const result = await execNode(['bin/cli.mjs', '--version'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatchSnapshot()
  })
})
