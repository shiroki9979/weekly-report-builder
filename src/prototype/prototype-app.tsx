// PROTOTYPE — 切換列與 Stage 宿主；元件獨立成檔以符合 react-refresh 規則
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { OverviewSlide } from "@/components/stage/overview-slide"
import { toSvg } from "html-to-image"

import { captureStageToPng } from "@/lib/stage-capture"
import { COPY } from "./content"
import { OVERVIEW_CONTEXT, OVERVIEW_PAGE } from "./overview-fixture"
import type { Lang, PageKey, VariantKey } from "./types"
import { VariantA } from "./variant-a"
import { VariantB } from "./variant-b"
import { VariantC } from "./variant-c"

const VARIANTS: VariantKey[] = ["A", "B", "C"]
const VARIANT_NAMES: Record<VariantKey, string> = {
  A: "Rule",
  B: "Observatory",
  C: "Block",
}
const PAGES: PageKey[] = ["cover", "compare", "table", "closing", "overview"]
const LANGS: Lang[] = ["en", "zh"]

type Route = { variant: VariantKey; page: PageKey; lang: Lang }

function readRoute(): Route {
  const params = new URLSearchParams(window.location.search)
  const variant = params.get("variant") as VariantKey | null
  const page = params.get("page") as PageKey | null
  const lang = params.get("lang") as Lang | null
  return {
    variant: variant && VARIANTS.includes(variant) ? variant : "A",
    page: page && PAGES.includes(page) ? page : "cover",
    lang: lang && LANGS.includes(lang) ? lang : "en",
  }
}

function writeRoute(route: Route): void {
  const params = new URLSearchParams(route)
  window.history.replaceState(null, "", `?${params.toString()}`)
}

// bare=1：給 headless 截圖用，Stage 1:1 且不顯示切換列
const BARE = new URLSearchParams(window.location.search).get("bare") === "1"
// capture=1：headless 驗證用，產生 SVG 後把嵌入的 @font-face 數量寫在 data-capture
const CAPTURE_CHECK =
  new URLSearchParams(window.location.search).get("capture") === "1"

function useScale(): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (BARE) return
    const update = () =>
      setScale(
        Math.min(
          (window.innerWidth - 32) / 1280,
          (window.innerHeight - 140) / 720,
          1
        )
      )
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return scale
}

function downloadPng(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function Prototype() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [fits, setFits] = useState(true)
  const [measureText, setMeasureText] = useState("")
  const [captureText, setCaptureText] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const scale = useScale()

  const go = useCallback((patch: Partial<Route>) => {
    setRoute((current) => {
      const next = { ...current, ...patch }
      writeRoute(next)
      return next
    })
  }, [])

  const cycleVariant = useCallback(
    (delta: number) => {
      const index = VARIANTS.indexOf(route.variant)
      go({
        variant: VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length],
      })
    },
    [go, route.variant]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && target.closest("input, textarea, [contenteditable]")) return
      if (event.key === "ArrowLeft") cycleVariant(-1)
      if (event.key === "ArrowRight") cycleVariant(1)
      if (event.key === "[" || event.key === "]") {
        const index = PAGES.indexOf(route.page)
        const delta = event.key === "]" ? 1 : -1
        go({ page: PAGES[(index + delta + PAGES.length) % PAGES.length] })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [cycleVariant, go, route.page])

  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    setFits(root.scrollHeight <= 720 && root.scrollWidth <= 1280)
    setMeasureText(`${root.scrollWidth}x${root.scrollHeight}`)
  }, [])

  useLayoutEffect(() => {
    measure()
    void document.fonts.ready.then(measure)
  }, [measure, route])

  useEffect(() => {
    if (!CAPTURE_CHECK) return
    const root = rootRef.current
    if (!root) return
    void document.fonts.ready
      .then(() => toSvg(root, { cacheBust: true }))
      .then((svg) => {
        const decoded = decodeURIComponent(svg)
        const faces = (decoded.match(/@font-face/g) ?? []).length
        const embedded = (decoded.match(/base64,/g) ?? []).length
        setCaptureText(`faces=${faces} base64=${embedded} bytes=${svg.length}`)
      })
      .catch((error: unknown) => {
        setCaptureText(
          `error: ${error instanceof Error ? error.message : String(error)}`
        )
      })
  }, [route])

  const copy = COPY[route.lang]

  const capture = async () => {
    const root = rootRef.current
    if (!root) return
    const blob = await captureStageToPng(root)
    downloadPng(
      blob,
      `prototype-${route.variant}-${route.page}-${route.lang}.png`
    )
  }

  return (
    <>
      <div
        className="proto-viewport"
        style={
          BARE ? { padding: 0, height: 720 } : { height: 720 * scale + 48 }
        }
      >
        <div className="proto-scale" style={{ transform: `scale(${scale})` }}>
          <div
            ref={rootRef}
            className={`stage-root${fits ? "" : "is-overflowing"}`}
            data-variant={route.variant}
            data-measure={measureText}
            data-capture={captureText}
            lang={route.lang === "zh" ? "zh-Hant" : "en"}
          >
            {route.page === "overview" ? (
              <>
                <OverviewSlide
                  page={OVERVIEW_PAGE}
                  context={OVERVIEW_CONTEXT}
                />
                <span className="proto-deck-title">{copy.deckTitle}</span>
              </>
            ) : route.variant === "A" ? (
              <VariantA page={route.page} copy={copy} lang={route.lang} />
            ) : route.variant === "B" ? (
              <VariantB page={route.page} copy={copy} lang={route.lang} />
            ) : (
              <VariantC page={route.page} copy={copy} lang={route.lang} />
            )}
          </div>
        </div>
      </div>
      {import.meta.env.DEV && !BARE ? (
        <div className="proto-bar">
          <button
            type="button"
            onClick={() => cycleVariant(-1)}
            aria-label="Previous variant"
          >
            ←
          </button>
          <span className="proto-label">
            {route.variant} ({VARIANT_NAMES[route.variant]})
          </span>
          <button
            type="button"
            onClick={() => cycleVariant(1)}
            aria-label="Next variant"
          >
            →
          </button>
          <span className="proto-sep" />
          {PAGES.map((page) => (
            <button
              key={page}
              type="button"
              className={page === route.page ? "is-active" : ""}
              onClick={() => go({ page })}
            >
              {page}
            </button>
          ))}
          <span className="proto-sep" />
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              className={lang === route.lang ? "is-active" : ""}
              onClick={() => go({ lang })}
            >
              {lang.toUpperCase()}
            </button>
          ))}
          <span className="proto-sep" />
          <span className={`proto-fit${fits ? "" : "is-bad"}`}>
            {fits ? "fits 1280×720" : "OVERFLOWS"}
          </span>
          <button type="button" onClick={() => void capture()}>
            PNG
          </button>
        </div>
      ) : null}
    </>
  )
}
