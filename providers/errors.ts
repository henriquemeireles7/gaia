export class ProviderError extends Error {
  constructor(
    public provider: string,
    public operation: string,
    public statusCode: number,
    public rawResponse: unknown,
  ) {
    super(`${provider}.${operation} failed (${statusCode})`)
    this.name = 'ProviderError'
  }
}
