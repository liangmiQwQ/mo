import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { SupportedShell } from '../config/config'

export const GHM_START_MARKER = '#_GHM_START_'
export const GHM_END_MARKER = '#_GHM_END_'

const shellRcRelativePaths: Record<SupportedShell, string> = {
  zsh: '.zshrc',
  bash: '.bashrc',
  fish: '.config/fish/config.fish',
}

function getShellSourceCommands(binName: string): Record<SupportedShell, string> {
  return {
    bash: `source <(${binName} shell bash)`,
    zsh: `source <(${binName} shell zsh)`,
    fish: `${binName} shell fish | source`,
  }
}

export function resolveShellRcPath(shell: SupportedShell, homePath: string = homedir()): string {
  return path.join(homePath, shellRcRelativePaths[shell])
}

export function buildManagedShellrcBlock(shell: SupportedShell, binName: string): string {
  const shellSourceCommands = getShellSourceCommands(binName)
  return [
    GHM_START_MARKER,
    '# Please do not edit the comments `#_GHM_START_` or `#_GHM_END_`, which probably makes ghm feature broken.',
    shellSourceCommands[shell],
    GHM_END_MARKER,
  ].join('\n')
}

export function upsertManagedShellrcBlock(content: string, managedBlock: string): string {
  const escapedStart = escapeRegex(GHM_START_MARKER)
  const escapedEnd = escapeRegex(GHM_END_MARKER)
  const pattern = new RegExp(`^${escapedStart}$[\\s\\S]*?^${escapedEnd}$\\n?`, 'gm')
  const matches = content.match(pattern)

  if (matches) {
    const withoutBlocks = content.replace(pattern, '').trimEnd()
    return withoutBlocks ? `${withoutBlocks}\n\n${managedBlock}\n` : `${managedBlock}\n`
  }

  const trimmed = content.trimEnd()
  return trimmed ? `${trimmed}\n\n${managedBlock}\n` : `${managedBlock}\n`
}

export async function syncManagedShellrc(
  shells: SupportedShell[],
  binName: string,
  homePath: string = homedir(),
) {
  for (const shell of shells) {
    const managedBlock = buildManagedShellrcBlock(shell, binName)
    const shellRcPath = resolveShellRcPath(shell, homePath)
    const existing = await readFileIfExists(shellRcPath)
    const updated = upsertManagedShellrcBlock(existing, managedBlock)

    await mkdir(path.dirname(shellRcPath), { recursive: true })
    await writeFile(shellRcPath, updated, 'utf8')
  }
}

async function readFileIfExists(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (err) {
    if (isMissingFileError(err)) {
      return ''
    }
    throw err
  }
}

function isMissingFileError(err: unknown): err is NodeJS.ErrnoException {
  return err !== null && typeof err === 'object' && 'code' in err && err.code === 'ENOENT'
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
