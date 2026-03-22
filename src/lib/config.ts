import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { GhmError } from './error.js'
import { expandTilde } from './path.js'

export type GhmConfig = {
  root: string
}

export type ReadConfigOptions = {
  configPath?: string
}

async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

export function defaultConfigPath(): string {
  return path.join(os.homedir(), '.config', 'ghm.json')
}

export async function readConfig(options: ReadConfigOptions = {}): Promise<GhmConfig> {
  const configPath = options.configPath ?? process.env.GHM_CONFIG_PATH ?? defaultConfigPath()

  let raw: string
  try {
    raw = await fs.readFile(configPath, 'utf8')
  } catch {
    throw new GhmError(`Missing config: ${configPath}`, 2)
  }

  if (!raw.trim()) throw new GhmError(`Empty config: ${configPath}`, 2)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GhmError(`Invalid JSON in config: ${configPath}`, 2)
  }

  if (!parsed || typeof parsed !== 'object') throw new GhmError(`Invalid config: ${configPath}`, 2)

  const root = (parsed as { root?: unknown }).root
  if (typeof root !== 'string' || !root.trim())
    throw new GhmError(`Invalid "root" in config: ${configPath}`, 2)

  const expandedRoot = path.resolve(expandTilde(root.trim()))
  if (!(await isDirectory(expandedRoot)))
    throw new GhmError(`Invalid "root" path: ${expandedRoot}`, 2)

  return { root: expandedRoot }
}
