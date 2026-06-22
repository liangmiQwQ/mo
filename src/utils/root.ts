import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

import { parse } from 'jsonc-parser'
import type { ParseError } from 'jsonc-parser'
import untildify from 'untildify'

export function getDefaultConfigPath(): string {
  return path.join(homedir(), '.config', 'morc.json')
}

export function resolveRootPath(configFilePath = getDefaultConfigPath()): string | undefined {
  if (!existsSync(configFilePath)) {
    return undefined
  }

  const config = parseJsonc(readFileSync(configFilePath, 'utf8'))
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
