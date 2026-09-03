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

  // 移除 script 標籤，防止 HTML 片段在預覽或截圖時執行任意 JavaScript 程式碼
  doc.querySelectorAll("script").forEach((el) => el.remove())

  // 移除內嵌事件處理器（如 onclick）與 javascript: 偽協定，阻斷潛在的 XSS 向量
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
  htmlFile: string
): Promise<string> {
  const url = resolveHtmlUrl(monday, htmlFile)
  const res = await fetch(url, { cache: "no-cache" })
  if (!res.ok) {
    throw new Error(`Failed to load HTML file: ${htmlFile} (status ${res.status})`)
  }

  const raw = await res.text()
  return sanitizeHtmlFragment(raw)
}
