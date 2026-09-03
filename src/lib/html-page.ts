const MONDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript\s*:/i

export function validateHtmlFileName(fileName: string): void {
  if (typeof fileName !== "string") {
    throw new Error("HTML file name must be a string")
  }

  if (fileName.trim() === "") {
    throw new Error("HTML file name must not be empty")
  }

  if (/\s/.test(fileName)) {
    throw new Error("HTML file name must not contain whitespace")
  }

  if (fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("HTML file name must not contain path separators")
  }

  if (fileName.includes("..")) {
    throw new Error("HTML file name must not contain path traversal (..)")
  }

  if (!fileName.endsWith(".html") || fileName === ".html") {
    throw new Error('HTML file name must end with ".html"')
  }
}

export function resolveHtmlUrl(monday: string, htmlFile: string): string {
  if (!MONDAY_PATTERN.test(monday)) {
    throw new Error(`Invalid Monday date for HTML page: ${monday}`)
  }

  validateHtmlFileName(htmlFile)

  return `/weeks/${monday}/${htmlFile}`
}

export function sanitizeHtmlFragment(rawHtml: string): string {
  if (typeof rawHtml !== "string" || rawHtml.trim() === "") {
    return ""
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, "text/html")

  // Remove script elements
  doc.querySelectorAll("script").forEach((el) => el.remove())

  // Strip on* attributes and javascript: URLs from all elements
  const allElements = [
    doc.documentElement,
    ...Array.from(doc.querySelectorAll("*")),
  ]

  for (const element of allElements) {
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value

      if (name.startsWith("on")) {
        element.removeAttribute(attr.name)
        continue
      }

      if (JAVASCRIPT_PROTOCOL_PATTERN.test(value)) {
        element.removeAttribute(attr.name)
      }
    }
  }

  // Preserve styles from head if present
  const headStyles = Array.from(doc.head.querySelectorAll("style"))
    .map((el) => el.outerHTML)
    .join("\n")

  const bodyContent = doc.body.innerHTML

  if (headStyles.length > 0) {
    return `${headStyles}\n${bodyContent}`
  }

  return bodyContent
}

const htmlCache = new Map<string, string>()

function cacheKey(monday: string, htmlFile: string): string {
  return `${monday}:${htmlFile}`
}

export function getCachedHtml(monday: string, htmlFile: string): string | null {
  return htmlCache.get(cacheKey(monday, htmlFile)) ?? null
}

export function setCachedHtml(
  monday: string,
  htmlFile: string,
  html: string
): void {
  htmlCache.set(cacheKey(monday, htmlFile), html)
}

export function clearHtmlCache(): void {
  htmlCache.clear()
}

export async function preloadHtmlFragment(
  monday: string,
  htmlFile: string
): Promise<string> {
  const cached = getCachedHtml(monday, htmlFile)
  if (cached !== null) {
    return cached
  }

  const url = resolveHtmlUrl(monday, htmlFile)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load HTML file: ${htmlFile} (status ${res.status})`)
  }

  const raw = await res.text()
  const sanitized = sanitizeHtmlFragment(raw)
  setCachedHtml(monday, htmlFile, sanitized)
  return sanitized
}
