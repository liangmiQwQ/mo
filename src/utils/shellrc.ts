import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SupportedShell } from './config'
import untildify from 'untildify'
import { innerBinName } from './runner'

export async function syncShellrc(shells: SupportedShell[]) {
  for (const shell of shells) {
    const managedBlock = buildManagedShellrcBlock(shell)
    const shellRcPath = resolveShellRcPath(shell)
    const existing = await readFileIfExists(shellRcPath)
    const updated = upsertManagedShellrcBlock(existing, managedBlock)

    await mkdir(path.dirname(shellRcPath), { recursive: true })
    await writeFile(shellRcPath, updated, 'utf8')
  }
}

const MO_START_MARKER = '#_MO_START_'
const MO_END_MARKER = '#_MO_END_'

const shellRcRelativePaths: Record<SupportedShell, string> = {
  zsh: '~/.zshrc',
  bash: '~/.bashrc',
  fish: '~/.config/fish/config.fish',
}

function getShellSourceCommands(): Record<SupportedShell, string> {
  return {
    bash: `source <(${innerBinName} shell bash)`,
    zsh: `source <(${innerBinName} shell zsh)`,
    fish: `${innerBinName} shell fish | source`,
  }
}

function resolveShellRcPath(shell: SupportedShell): string {
  return untildify(shellRcRelativePaths[shell])
}

function buildManagedShellrcBlock(shell: SupportedShell): string {
  const shellSourceCommands = getShellSourceCommands()
  return [
    MO_START_MARKER,
    '# Please do not edit the comments `#_MO_START_` or `#_MO_END_`, which probably makes mo feature broken.',
    shellSourceCommands[shell],
    MO_END_MARKER,
  ].join('\n')
}

function upsertManagedShellrcBlock(content: string, managedBlock: string): string {
  const escapedStart = escapeRegex(MO_START_MARKER)
  const escapedEnd = escapeRegex(MO_END_MARKER)
  const pattern = new RegExp(`^${escapedStart}$[\\s\\S]*?^${escapedEnd}$\\n?`, 'gm')
  const matches = content.match(pattern)

  if (matches) {
    const withoutBlocks = content.replace(pattern, '').trimEnd()
    return withoutBlocks ? `${withoutBlocks}\n\n${managedBlock}\n` : `${managedBlock}\n`
  }

  const trimmed = content.trimEnd()
  return trimmed ? `${trimmed}\n\n${managedBlock}\n` : `${managedBlock}\n`
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
