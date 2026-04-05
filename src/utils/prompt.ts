import { checkbox, confirm, input, search } from '@inquirer/prompts'
import { error } from './error'

type TextPromptOptions = {
  initial?: string
  validate?: (value: string) => boolean | string | Promise<boolean | string>
}

type AutocompleteChoice<T> = {
  title: string
  value: T
}

const onSetupCancel = () => {
  error('Setup canceled.', 78)
}

function catchCancel<T>(promise: Promise<T>, onCancel: () => void = onSetupCancel): Promise<T> {
  return promise.catch((err) => {
    if (err instanceof Error && err.name === 'ExitPromptError') {
      onCancel()
    }
    throw err
  })
}

export async function promptText(
  message: string,
  _name: string,
  options: TextPromptOptions = {},
): Promise<string> {
  const answer = await catchCancel(
    input({
      message,
      default: options.initial,
      validate: options.validate,
    }),
  )
  return answer || ''
}

export async function promptConfirm(
  message: string,
  _name: string,
  options: { default?: boolean } = {},
): Promise<boolean> {
  return catchCancel(
    confirm({
      message,
      default: options.default ?? true,
    }),
  )
}

export async function promptMultiselect<T extends string>(
  message: string,
  _name: string,
  choices: Array<{ title: string; value: T }>,
  initial?: T[],
): Promise<T[]> {
  return catchCancel(
    checkbox({
      message,
      choices: choices.map((c) => ({
        name: c.title,
        value: c.value,
        checked: initial ? initial.includes(c.value) : false,
      })),
    }),
  )
}

export async function promptAutocomplete<T>(
  message: string,
  _name: string,
  choices: AutocompleteChoice<T>[],
  onCancelMessage: string,
): Promise<T | undefined> {
  return catchCancel(
    search({
      message,
      source: async (term: string | undefined) => {
        const query = (term || '').trim().toLowerCase()
        if (!query) {
          return choices.map((c) => ({ name: c.title, value: c.value }))
        }
        return choices
          .filter((option) => option.title.toLowerCase().includes(query))
          .map((c) => ({ name: c.title, value: c.value }))
      },
    }),
    () => {
      error(onCancelMessage, 78)
    },
  )
}
