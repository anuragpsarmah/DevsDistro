import { AsyncLocalStorage } from "async_hooks";

// Wide event log context - based on https://loggingsucks.com/
export interface LogContext {
  request_id?: string;
  user?: {
    id?: string;
    username?: string;
    github_id?: string;
  };
  action?: string;
  outcome?:
    | "success"
    | "error"
    | "validation_failed"
    | "unauthorized"
    | "not_found"
    | "forbidden"
    | "organization_rejected"
    | "installation_owned_by_another_user"
    | "invalid_state"
    | "account_mismatch";
  entity?: {
    type?: string;
    id?: string;
    ids?: string[];
    github_repo_id?: string;
    project_id?: string;
  };
  search?: {
    term?: string;
    filters?: Record<string, unknown>;
    results_count?: number;
  };
  error?: {
    message?: string;
    name?: string;
    stack?: string;
    code?: string;
  };
  error_message?: string;
  external_api_latency_ms?: number;
  db_latency_ms?: number;
  auth_status?:
    | "authenticated"
    | "unauthenticated"
    | "token_invalid"
    | "token_expired"
    | "token_reuse_detected";
  [key: string]: unknown;
}

export const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

// Merges additional data into the current request's log context
export function enrichContext(context: Partial<LogContext>): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null) {
        if (
          typeof value === "object" &&
          !Array.isArray(value) &&
          store[key] &&
          typeof store[key] === "object"
        ) {
          store[key] = {
            ...(store[key] as Record<string, unknown>),
            ...(value as Record<string, unknown>),
          };
        } else {
          store[key] = value;
        }
      }
    }
  }
}
