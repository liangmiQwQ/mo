import { describe, expect, test } from 'vitest'

import { exec } from '../utils'

describe('ghm cli', () => {
  test('--help', async () => {
    const result = await exec(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatchSnapshot()
  })
})
