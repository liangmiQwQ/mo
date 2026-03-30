export const isRoot = !process.env.npm_config_save && process.cwd() === process.env.INIT_CWD
export const isTest = process.env.VITEST === 'true'

export function shouldRunHooks() {
  return !isTest && isRoot
}

export const isWindows = process.platform === 'win32'

export function isGlobalRun(): boolean {
  return process.env.npm_config_global === 'true' || process.env.npm_config_location === 'global'
}
