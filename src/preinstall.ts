import path from 'node:path'
import { error } from './output/error'
import { shouldRunHooks } from './utils/hooks'

type ErrorFn = (message: string, exitCode?: number) => never

type PreinstallDeps = {
  platform: NodeJS.Platform
  env: NodeJS.ProcessEnv
  cwd: string
  fail: ErrorFn
}

const defaultDeps: PreinstallDeps = {
  platform: process.platform,
  env: process.env,
  cwd: process.cwd(),
  fail: error,
}

export function runPreinstallChecks(deps: Partial<PreinstallDeps> = {}): void {
  const { platform, env, cwd, fail } = { ...defaultDeps, ...deps }

  if (platform === 'win32') {
    fail('Windows is not supported. ghm currently supports macOS and Linux only.', 69)
  }

  // Allow contributor setup inside the ghm source repo itself.
  if (isInstallingFromSourceRepo(env, cwd)) {
    return
  }

  if (!isGlobalInstall(env)) {
    fail(
      'Local installation is not supported. Please install ghm globally with `vp install -g @liangmi/ghm`.',
      78,
    )
  }
}

function isGlobalInstall(env: NodeJS.ProcessEnv): boolean {
  return env.npm_config_global === 'true' || env.npm_config_location === 'global'
}

function isInstallingFromSourceRepo(env: NodeJS.ProcessEnv, cwd: string): boolean {
  const initCwd = env.INIT_CWD
  if (!initCwd) {
    return false
  }

  return path.resolve(initCwd) === path.resolve(cwd)
}

if (shouldRunHooks()) {
  runPreinstallChecks()
}
