import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { promptRunSetupOnMissingConfig, runSetupCommand } from '../src/commands/setup'

type PromptMock = (
  question: { name: string } | Array<{ name: string }>,
  options?: { onCancel?: () => boolean | void },
) => Promise<Record<string, unknown>>

describe('setup command', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
  })

  test('writes config and syncs shellrc when setup succeeds', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-setup-'))
    tempDirs.push(dir)

    const configPath = path.join(dir, '.config', 'ghmrc.json')
    const rootPath = path.join(dir, 'code')

    const prompt: PromptMock = vi.fn(async (question) => {
      const currentQuestion = Array.isArray(question) ? question[0] : question

      if (currentQuestion.name === 'root') {
        return { root: rootPath }
      }

      if (currentQuestion.name === 'shells') {
        return { shells: ['zsh'] }
      }

      return {}
    })
    const runCommand = vi.fn(async () => ({ exitCode: 0 }))
    const syncShellrc = vi.fn(async () => {})

    await runSetupCommand(
      { configPath, binName: 'ghm' },
      {
        prompt,
        runCommand,
        syncShellrc,
      },
    )

    const saved = JSON.parse(await readFile(configPath, 'utf8')) as {
      $schema: string
      root: string
      shells: string[]
    }

    expect(saved.$schema).toBe(
      'https://raw.githubusercontent.com/liangmiQwQ/ghm/main/config_schema.json',
    )
    expect(saved.root).toBe(rootPath)
    expect(saved.shells).toEqual(['zsh'])
    expect(syncShellrc).toHaveBeenCalledWith(['zsh'], 'ghm')
  })

  test('exits with code 69 when gh auth is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-setup-'))
    tempDirs.push(dir)

    const configPath = path.join(dir, '.config', 'ghmrc.json')
    const prompt = vi.fn()
    const runCommand = vi.fn(async (command: string) => {
      if (command === 'gh') {
        return { exitCode: 1 }
      }
      return { exitCode: 0 }
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      runSetupCommand(
        { configPath, binName: 'ghm' },
        {
          prompt,
          runCommand,
        },
      ),
    ).rejects.toThrow('process.exit called')

    expect(exitSpy).toHaveBeenCalledWith(69)
    expect(prompt).not.toHaveBeenCalled()
  })

  test('exits with code 78 when config file already exists', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-setup-'))
    tempDirs.push(dir)

    const configPath = path.join(dir, '.config', 'ghmrc.json')
    await mkdir(path.dirname(configPath), { recursive: true })
    await writeFile(configPath, '{"root":"/tmp","shells":["zsh"]}', 'utf8')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(runSetupCommand({ configPath, binName: 'ghm' })).rejects.toThrow(
      'process.exit called',
    )
    expect(exitSpy).toHaveBeenCalledWith(78)
  })

  test('runs setup flow when missing config prompt is confirmed', async () => {
    const runSetup = vi.fn(async () => {})
    const prompt: PromptMock = vi.fn(async () => ({ runSetup: true }))

    await promptRunSetupOnMissingConfig(runSetup, { prompt })

    expect(runSetup).toHaveBeenCalledTimes(1)
  })

  test('exits with code 78 when missing config prompt is rejected', async () => {
    const runSetup = vi.fn(async () => {})
    const prompt: PromptMock = vi.fn(async () => ({ runSetup: false }))

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(promptRunSetupOnMissingConfig(runSetup, { prompt })).rejects.toThrow(
      'process.exit called',
    )
    expect(exitSpy).toHaveBeenCalledWith(78)
    expect(runSetup).not.toHaveBeenCalled()
  })
})
