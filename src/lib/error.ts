export class GhmError extends Error {
  readonly exitCode: number

  constructor(message: string, exitCode = 1) {
    super(message)
    this.name = 'GhmError'
    this.exitCode = exitCode
  }
}
