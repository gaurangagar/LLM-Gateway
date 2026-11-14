export class GatewayError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}