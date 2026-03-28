import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import untildify from 'untildify'

import { parse } from 'jsonc-parser'

import { error } from '../output/error'

export type GlobalUserConfig = {
  root: string
  // For the future use
  editor?: string
}

export function getDefaultConfigPath(): string {
  return path.join(homedir(), '.config', 'ghmrc.json')
}

export function loadConfig(configPath?: string): GlobalUserConfig {
  const configFilePath = configPath ? path.resolve(configPath) : getDefaultConfigPath()

  if (!existsSync(configFilePath)) {
    error(`Couldn't find config file at ${configFilePath}`)
  }

  const content = readFileSync(configFilePath, 'utf8').trim()

  return parseConfig(content, configFilePath)
}

function parseConfig(jsonc: string, configFilePath: string): GlobalUserConfig {
  const invalidConfigError = (message: string) =>
    error(`Invalid config: ${message} at ${configFilePath}`)

  if (!jsonc) {
    invalidConfigError('Empty file found')
  }

  const config = parse(jsonc, undefined, { allowTrailingComma: true })

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    invalidConfigError('Config must be an object')
  }

  const root = config.root
  if (typeof root !== 'string' || !root) {
    invalidConfigError('"root" must be a non-empty string')
  }

  const rootPath = path.resolve(path.dirname(configFilePath), untildify(root))

  if (!existsSync(rootPath)) {
    invalidConfigError(`"root" directory does not exist`)
  }

  if (!statSync(rootPath).isDirectory()) {
    invalidConfigError(`"root" path is not a directory`)
  }

  return {
    root: rootPath,
    ...(config.editor ? { editor: String(config.editor) } : {}),
  }
}
