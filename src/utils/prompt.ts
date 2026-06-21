import prompts from 'prompts'

import { error } from './error.ts'

interface TextPromptOptions {
  initial?: string
  validate?: (value: string) => boolean | string
}

interface AutocompleteChoice<T> {
  title: string
  value: T
}

const onSetupCancel = (): never => {
  error('Canceled.', 78)
}

async function catchCancel<T>(
  promise: Promise<T | undefined>,
  onCancel: () => void = onSetupCancel
): Promise<T> {
  const result = await promise
  if (result === undefined) {
    onCancel()
  }
  return result as T
}

export async function promptText(
  message: string,
  name: string,
  options: TextPromptOptions = {}
): Promise<string> {
  const response = await prompts({
    type: 'text',
    name,
    message,
    initial: options.initial,
    validate: options.validate
  })
  const answer = await catchCancel<string>(Promise.resolve(response[name]))
  return answer
}

export async function promptConfirm(
  message: string,
  name: string,
  options: { default?: boolean } = {}
): Promise<boolean> {
  const response = await prompts({
    type: 'confirm',
    name,
    message,
    initial: options.default ?? true
  })
  const answer = await catchCancel<boolean>(Promise.resolve(response[name]))
  return answer
}

export async function promptMultiselect<T extends string>(
  message: string,
  name: string,
  choices: { title: string; value: T }[],
  initial?: T[]
): Promise<T[]> {
  const response = await prompts({
    type: 'multiselect',
    name,
    message,
    choices: choices.map(choice => ({
      title: choice.title,
      value: choice.value,
      selected: initial ? initial.includes(choice.value) : false
    }))
  })
  const answer = await catchCancel<T[]>(Promise.resolve(response[name]))
  return answer
}

export async function promptAutocomplete<T>(
  message: string,
  name: string,
  choices: AutocompleteChoice<T>[],
  onCancelMessage: string
): Promise<T | undefined> {
  return catchCancel<T | undefined>(
    prompts({
      type: 'autocomplete',
      name,
      message,
      choices: choices.map(choice => ({ title: choice.title, value: choice.value })),
      suggest: (input, choicesList) => {
        const query = input.trim().toLowerCase()
        if (!query) {
          return Promise.resolve(choicesList)
        }
        return Promise.resolve(
          choicesList.filter(choice => choice.title.toLowerCase().includes(query))
        )
      }
    }).then((response: Record<string, unknown>) => response[name] as T | undefined),
    () => {
      error(onCancelMessage, 78)
    }
  )
}
