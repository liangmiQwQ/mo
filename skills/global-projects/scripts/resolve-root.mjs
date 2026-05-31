#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const configPath = path.join(homedir(), '.config', 'morc.json')
const rootPath = resolveRootPath(configPath)

console.log(
  JSON.stringify(
    rootPath
      ? {
          configPath,
          rootPath,
        }
      : {
          configPath,
          rootPath: null,
          error: 'morc.json was not found or does not contain a string root field',
        },
    null,
    2,
  ),
)

function resolveRootPath(configFilePath) {
  if (!existsSync(configFilePath)) {
    return undefined
  }

  const config = parseJsonc(readFileSync(configFilePath, 'utf8'))
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return undefined
  }

  const root = config.root
  if (typeof root !== 'string' || !root.trim()) {
    return undefined
  }

  return path.resolve(path.dirname(configFilePath), expandHome(root.trim()))
}

function expandHome(value) {
  if (value === '~') {
    return homedir()
  }

  if (value.startsWith('~/')) {
    return path.join(homedir(), value.slice(2))
  }

  return value
}

function parseJsonc(content) {
  try {
    return JSON.parse(stripJsonc(content))
  } catch {
    return undefined
  }
}

function stripJsonc(content) {
  let output = ''
  let inString = false
  let quote = ''
  let escaped = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        inString = false
      }
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      quote = char
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      index = content.indexOf('\n', index)
      if (index === -1) {
        break
      }
      output += '\n'
      continue
    }

    if (char === '/' && next === '*') {
      const end = content.indexOf('*/', index + 2)
      index = end === -1 ? content.length : end + 1
      continue
    }

    output += char
  }

  return output.replace(/,\s*([}\]])/g, '$1')
}
