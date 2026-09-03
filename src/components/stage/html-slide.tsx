import { useEffect, useRef, useState } from "react"

import {
  getCachedHtml,
  resolveHtmlUrl,
  sanitizeHtmlFragment,
  setCachedHtml,
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
  const cachedHtml = getCachedHtml(monday, page.htmlFile)

  const [fetchedState, setFetchedState] = useState<{
    key: string
    html: string | null
    error: string | null
  }>({
    key: currentKey,
    html: cachedHtml,
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

  const html =
    cachedHtml ?? (fetchedState.key === currentKey ? fetchedState.html : null)
  const error = fetchedState.key === currentKey ? fetchedState.error : null
  const loading = html === null && error === null && validationError === null

  useEffect(() => {
    if (validationError !== null) {
      return
    }

    if (getCachedHtml(monday, page.htmlFile) !== null) {
      return
    }

    const controller = new AbortController()

    async function load() {
      try {
        const url = resolveHtmlUrl(monday, page.htmlFile)
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          setFetchedState({
            key: currentKey,
            html: null,
            error: `Failed to load HTML file: ${page.htmlFile}`,
          })
          return
        }

        const raw = await res.text()
        const sanitized = sanitizeHtmlFragment(raw)
        setCachedHtml(monday, page.htmlFile, sanitized)
        setFetchedState({
          key: currentKey,
          html: sanitized,
          error: null,
        })
      } catch (cause: unknown) {
        if (controller.signal.aborted) {
          return
        }
        setFetchedState({
          key: currentKey,
          html: null,
          error:
            cause instanceof Error
              ? cause.message
              : `Failed to load HTML file: ${page.htmlFile}`,
        })
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [currentKey, monday, page.htmlFile, validationError])

  useEffect(() => {
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
      <div className="stage-warning" role="status">
        Invalid HTML file: {page.htmlFile}
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="stage-warning" role="status">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="stage-placeholder" role="status">
        Loading HTML slide…
      </div>
    )
  }

  if (isCapture) {
    return (
      <div
        className="h-full w-full"
        data-testid="html-slide-capture"
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
    )
  }

  return (
    <div
      ref={shadowContainerRef}
      className="h-full w-full"
      data-testid="html-slide-shadow"
    />
  )
}
