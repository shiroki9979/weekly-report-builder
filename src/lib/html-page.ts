import DOMPurify from "dompurify"

const MONDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

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

  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    // 逃生口頁常含 inline SVG；預設 HTML profile 會剝掉 svg，16:9 圖會變成空白投影片
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: ["style"],
    FORBID_TAGS: [
      "base",
      "embed",
      "frame",
      "frameset",
      "iframe",
      "link",
      "meta",
      "object",
      "portal",
    ],
    FORBID_ATTR: ["srcdoc"],
    WHOLE_DOCUMENT: true,
  })
  const parser = new DOMParser()
  const doc = parser.parseFromString(sanitizedHtml, "text/html")

  // 保留 head 區段內的 style 標籤，使外部匯入之自訂樣式能正確套用於投影片
  const headStyles = Array.from(doc.head.querySelectorAll("style"))
    .map((el) => el.outerHTML)
    .join("\n")

  // 保留原 body 標籤上的 class 與 style 屬性，避免整頁背景色或整體排版樣式遺失
  const rawClass = doc.body.getAttribute("class")
  const rawStyle = doc.body.getAttribute("style")
  const bodyClass = rawClass && rawClass.trim() !== "" ? rawClass : null
  const bodyStyle = rawStyle && rawStyle.trim() !== "" ? rawStyle : null

  let bodyContent = doc.body.innerHTML

  if (bodyClass || bodyStyle) {
    const classAttr = bodyClass ? ` class="${bodyClass}"` : ""
    const styleAttr = bodyStyle ? ` style="${bodyStyle}"` : ""
    bodyContent = `<div${classAttr}${styleAttr}>${bodyContent}</div>`
  }

  if (headStyles.length > 0) {
    return `${headStyles}\n${bodyContent}`
  }

  return bodyContent
}

export async function preloadHtmlFragment(
  monday: string,
  htmlFile: string,
  signal?: AbortSignal
): Promise<string> {
  const url = resolveHtmlUrl(monday, htmlFile)
  const requestOptions: RequestInit = signal
    ? { cache: "no-cache", signal }
    : { cache: "no-cache" }
  const res = await fetch(url, requestOptions)
  if (!res.ok) {
    throw new Error(`Failed to load HTML file: ${htmlFile} (status ${res.status})`)
  }

  const raw = await res.text()
  return sanitizeHtmlFragment(raw)
}
