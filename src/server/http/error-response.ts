import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, type ErrorFields } from "./app-error";

function zodFields(error: ZodError): ErrorFields {
  const fields: ErrorFields = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".") || "request";
    fields[field] = [...(fields[field] ?? []), issue.message];
  }

  return fields;
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          fields: zodFields(error),
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields ?? {},
        },
      },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        fields: {},
      },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
