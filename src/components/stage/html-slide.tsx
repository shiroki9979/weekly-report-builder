import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"

import {
  resolveHtmlUrl,
  sanitizeHtmlFragment,
  validateHtmlFileName,
} from "@/lib/html-page"
import type { HtmlWeekPage } from "@/lib/week-document"

export type HtmlSlideProps = {
  page: HtmlWeekPage
  monday: string
  isCapture?: boolean
}

export function HtmlSlide({ page, monday, isCapture = false }: HtmlSlideProps) {
  const currentKey = `${monday}:${page.htmlFile}`

  const [fetchedState, setFetchedState] = useState<{
    key: string
    html: string | null
    error: string | null
  }>({
    key: currentKey,
    html: null,
    error: null,
  })
  const shadowContainerRef = useRef<HTMLDivElement>(null)

  let validationError: string | null = null
  try {
    validateHtmlFileName(page.htmlFile)
  } catch (cause: unknown) {
    validationError =
      cause instanceof Error ? cause.message : "Invalid HTML file"
  }

  const isCurrent = fetchedState.key === currentKey
  const html = isCurrent ? fetchedState.html : null
  const error = isCurrent ? fetchedState.error : null
  const loading = validationError === null && html === null && error === null

  useEffect(() => {
    if (validationError !== null) {
      return
    }

    // 避免快取過期問題，強制以 no-cache 擷取最新 HTML 片段內容
    const controller = new AbortController()

    async function load() {
      try {
        const url = resolveHtmlUrl(monday, page.htmlFile)
        const res = await fetch(url, {
          cache: "no-cache",
          signal: controller.signal,
        })
        if (!res.ok) {
          flushSync(() => {
            setFetchedState({
              key: currentKey,
              html: null,
              error: `Failed to load HTML file: ${page.htmlFile}`,
            })
          })
          return
        }

        const raw = await res.text()
        const sanitized = sanitizeHtmlFragment(raw)
        flushSync(() => {
          setFetchedState({
            key: currentKey,
            html: sanitized,
            error: null,
          })
        })
      } catch (cause: unknown) {
        if (controller.signal.aborted) {
          return
        }
        flushSync(() => {
          setFetchedState({
            key: currentKey,
            html: null,
            error:
              cause instanceof Error
                ? cause.message
                : `Failed to load HTML file: ${page.htmlFile}`,
          })
        })
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [currentKey, monday, page.htmlFile, validationError])

  useEffect(() => {
    // 預覽環境掛載於 Shadow DOM 以隔離 CSS 樣式；截圖模式則由 React 直接注入 Light DOM
    if (isCapture || !shadowContainerRef.current || html === null) {
      return
    }

    const container = shadowContainerRef.current
    const shadowRoot =
      container.shadowRoot ?? container.attachShadow({ mode: "open" })
    shadowRoot.innerHTML = html
  }, [html, isCapture])

  if (validationError !== null) {
    return (
      <div className="stage-warning" role="status" data-status="error">
        Invalid HTML file: {page.htmlFile}
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="stage-warning" role="status" data-status="error">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="stage-placeholder" role="status" data-status="loading">
        Loading HTML slide…
      </div>
    )
  }

  if (isCapture) {
    return (
      <div
        className="h-full w-full"
        data-testid="html-slide-capture"
        data-status="ready"
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
    )
  }

  return (
    <div
      ref={shadowContainerRef}
      className="h-full w-full"
      data-testid="html-slide-shadow"
      data-status="ready"
    />
  )
}
