import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadConfig } from '../src/config/config'

describe('config shells option', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
  })

  test('normalizes and deduplicates shells', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-config-'))
    tempDirs.push(dir)
    const root = path.join(dir, 'root')
    const configPath = path.join(dir, 'ghmrc.json')

    await mkdir(root, { recursive: true })
    await writeFile(
      configPath,
      JSON.stringify({ root: './root', shells: ['ZSH', 'bash', 'zsh', ' fish '] }),
      'utf8',
    )

    const config = loadConfig(configPath)

    expect(config.shells).toEqual(['zsh', 'bash', 'fish'])
  })

  test('throws for invalid shell name', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-config-'))
    tempDirs.push(dir)
    const root = path.join(dir, 'root')
    const configPath = path.join(dir, 'ghmrc.json')

    await mkdir(root, { recursive: true })
    await writeFile(configPath, JSON.stringify({ root: './root', shells: ['pwsh'] }), 'utf8')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => loadConfig(configPath)).toThrow('process.exit called')
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })

  test('throws when shells is not an array', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-config-'))
    tempDirs.push(dir)
    const root = path.join(dir, 'root')
    const configPath = path.join(dir, 'ghmrc.json')

    await mkdir(root, { recursive: true })
    await writeFile(configPath, JSON.stringify({ root: './root', shells: 'zsh' }), 'utf8')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => loadConfig(configPath)).toThrow('process.exit called')
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })

  test('throws when shells is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-config-'))
    tempDirs.push(dir)
    const root = path.join(dir, 'root')
    const configPath = path.join(dir, 'ghmrc.json')

    await mkdir(root, { recursive: true })
    await writeFile(configPath, JSON.stringify({ root: './root' }), 'utf8')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => loadConfig(configPath)).toThrow('process.exit called')
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })

  test('throws when shells is an empty array', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ghm-config-'))
    tempDirs.push(dir)
    const root = path.join(dir, 'root')
    const configPath = path.join(dir, 'ghmrc.json')

    await mkdir(root, { recursive: true })
    await writeFile(configPath, JSON.stringify({ root: './root', shells: [] }), 'utf8')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as (code?: string | number | null) => never)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => loadConfig(configPath)).toThrow('process.exit called')
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })
})
