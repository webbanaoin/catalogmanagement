import "server-only";

export type ErrorFields = Record<string, string[]>;

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: ErrorFields;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    fields?: ErrorFields;
  }) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.fields = options.fields;
  }
}
