import { describe, expect, test } from 'vitest'

import { execNode } from '../exec'

describe('ghm cli', () => {
  test('--help', async () => {
    const result = await execNode(['bin/cli.mjs', '--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatchSnapshot()
  })
})
