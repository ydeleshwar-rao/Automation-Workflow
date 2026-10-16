import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

/** Prisma error codes we translate to HTTP status codes. https://www.prisma.io/docs/orm/reference/error-reference */
const PRISMA_ERROR_STATUS: Record<string, number> = {
  P2002: 409, // unique constraint failed
  P2003: 409, // foreign key constraint failed
  P2025: 404, // record required by the operation was not found
  P1001: 503, // database server unreachable
  P1002: 503, // database server timed out
};

const PRISMA_ERROR_MESSAGE: Record<string, string> = {
  P2002: "A record with these values already exists",
  P2003: "This record is linked to a record that does not exist or is still in use",
  P2025: "Record not found",
  P1001: "Database is unavailable",
  P1002: "Database is unavailable",
};

/**
 * Map Prisma errors → ApiError. Returns null for anything that is not a Prisma error.
 */
export function normalizeDatabaseError(error: unknown): ApiError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const statusCode = PRISMA_ERROR_STATUS[error.code] ?? 500;
    const message = PRISMA_ERROR_MESSAGE[error.code] ?? "Database request failed";
    return new ApiError(statusCode, message, { errors: [error.code], cause: error });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ApiError(400, "Invalid database query input", { cause: error });
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new ApiError(503, "Database is unavailable", { cause: error });
  }

  return null;
}
