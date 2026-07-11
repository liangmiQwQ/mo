import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { pathExists } from '../utils/fs.ts'
import { getShellActionsPath, shellIntegrationEnvName } from '../utils/runner.ts'

type ShellAction = CdAction | EditAction

interface CdAction {
  type: 'cd'
  path: string
}

interface EditAction {
  type: 'edit'
  editor: string
  path: string
}

type SupportedActionShell = 'bash' | 'zsh' | 'fish'

const nodeEnvironmentNames = [
  'NODE_OPTIONS',
  'NODE_PATH',
  'INIT_CWD',
  'npm_command',
  'npm_config_user_agent',
  'npm_execpath',
  'npm_lifecycle_event',
  'npm_lifecycle_script',
  'npm_node_execpath',
  'npm_package_json',
  'npm_package_name',
  'npm_package_version',
  'PNPM_HOME',
  'COREPACK_ENABLE_DOWNLOAD_PROMPT',
  'COREPACK_HOME',
  'YARN_WRAP_OUTPUT'
]

export function hasShellIntegration(): boolean {
  return process.env[shellIntegrationEnvName] === '1'
}

export async function appendCdAction(path: string): Promise<void> {
  await appendShellAction({ type: 'cd', path })
}

export async function appendEditAction(editor: string, path: string): Promise<void> {
  await appendShellAction({ type: 'edit', editor, path })
}

export async function clearShellActions(): Promise<void> {
  const actionsPath = getShellActionsPath()
  if (await pathExists(actionsPath)) {
    await rm(actionsPath)
  }
}

export async function generateShellActions(shell: string): Promise<string> {
  if (!isSupportedActionShell(shell)) {
    return ''
  }

  const actions = await readShellActions()
  await clearShellActions()

  return actions
    .map(action => renderShellAction(action, shell))
    .filter(Boolean)
    .join('\n')
}

export function buildDirectEditorEnv(): NodeJS.ProcessEnv {
  return buildCleanEditorEnv(process.env)
}

async function appendShellAction(action: ShellAction): Promise<void> {
  const actions = await readShellActions()
  await writeFile(getShellActionsPath(), JSON.stringify([...actions, action]), 'utf8')
}

async function readShellActions(): Promise<ShellAction[]> {
  const actionsPath = getShellActionsPath()
  if (!(await pathExists(actionsPath))) {
    return []
  }

  try {
    const parsed = JSON.parse(await readFile(actionsPath, 'utf8'))
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isShellAction)
  } catch {
    return []
  }
}

function renderShellAction(action: ShellAction, shell: SupportedActionShell): string {
  if (action.type === 'cd') {
    return `cd -- ${quoteShellValue(action.path, shell)}`
  }

  return renderEditAction(action, shell)
}

function renderEditAction(action: EditAction, shell: SupportedActionShell): string {
  return `${quoteShellValue(action.editor, shell)} ${quoteShellValue(action.path, shell)}`
}

function buildCleanEditorEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source }
  for (const name of nodeEnvironmentNames) {
    delete env[name]
  }
  env.PATH = cleanPath(source.PATH)
  return env
}

function cleanPath(value: string | undefined): string {
  if (!value) {
    return ''
  }

  const nodePathParts = getNodePathParts()
  return value
    .split(':')
    .filter(part => part && !part.endsWith('/node_modules/.bin') && !nodePathParts.has(part))
    .join(':')
}

function getNodePathParts(): Set<string> {
  const parts = new Set<string>()
  for (const value of [process.execPath, process.env.npm_node_execpath]) {
    if (value) {
      parts.add(path.dirname(value))
    }
  }

  return parts
}

function quoteShellValue(value: string, shell: SupportedActionShell): string {
  if (shell === 'fish') {
    return `'${value.replaceAll(/['\\]/g, String.raw`\$&`)}'`
  }

  return `'${value.replaceAll(`'`, `'\\''`)}'`
}

function isSupportedActionShell(shell: string): shell is SupportedActionShell {
  return shell === 'bash' || shell === 'zsh' || shell === 'fish'
}

function isShellAction(value: unknown): value is ShellAction {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  if (record.type === 'cd') {
    return typeof record.path === 'string'
  }

  return (
    record.type === 'edit' && typeof record.editor === 'string' && typeof record.path === 'string'
  )
}
