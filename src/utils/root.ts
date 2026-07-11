import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

import { parse } from 'jsonc-parser'
import type { ParseError } from 'jsonc-parser'
import untildify from 'untildify'

import { pathExists } from './fs.ts'

export function getDefaultConfigPath(): string {
  return path.join(homedir(), '.config', 'morc.json')
}

export async function resolveRootPath(
  configFilePath = getDefaultConfigPath()
): Promise<string | undefined> {
  if (!(await pathExists(configFilePath))) {
    return undefined
  }

  const config = parseJsonc(await readFile(configFilePath, 'utf8'))
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return undefined
  }

  return resolveRootFromConfig(config, configFilePath)
}

export function parseJsonc(jsonc: string): unknown {
  const errors: ParseError[] = []
  const config = parse(jsonc, errors, { allowTrailingComma: true })

  return errors.length > 0 ? undefined : config
}

export function resolveRootFromConfig(config: object, configFilePath: string): string | undefined {
  const { root } = config as { root?: unknown }
  if (typeof root !== 'string' || !root.trim()) {
    return undefined
  }

  return path.resolve(path.dirname(configFilePath), untildify(root.trim()))
}
