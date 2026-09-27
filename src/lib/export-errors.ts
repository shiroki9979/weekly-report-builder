export function abortError(): DOMException {
  return new DOMException("Export was aborted", "AbortError")
}

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}
