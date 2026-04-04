export async function withPathSelector<T>(
  root: string,
  target: string | undefined,
  action: (targetPath: string) => T | Promise<T>,
): Promise<T> {
  const resolvedTarget = target?.trim()

  const nextPath = console.log(`!TODO ${resolvedTarget}`) as any

  return action(nextPath)
}
