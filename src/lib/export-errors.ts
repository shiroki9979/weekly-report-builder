export function abortError(): DOMException {
  return new DOMException("Export was aborted", "AbortError")
}
