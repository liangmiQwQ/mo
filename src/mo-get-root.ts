#!/usr/bin/env node
import { getDefaultConfigPath, resolveRootPath } from './utils/root'

const configPath = getDefaultConfigPath()
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
