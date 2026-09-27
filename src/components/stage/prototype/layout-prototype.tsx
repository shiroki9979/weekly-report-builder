import { useEffect, useState } from "react"
import { StageFrame } from "@/components/stage/stage-frame"
import { NextActionsSlide } from "@/components/stage/next-actions-slide"
import { Button } from "@/components/ui/button"
import { ActionsRowsPrototype } from "./actions-rows-prototype"
import { TrendPrototype } from "./trend-prototype"
import { actionFixtures, trendFixtures, weekLabels } from "./fixtures"
import "./prototype.css"

// 可拋棄的四視圖比較；同一用途共用情境，構圖變動不更換資料。
const variants = [
  {
    id: "trend-wide",
    name: "Trend · full width",
    family: "trend",
    question: "Does a wide chart make the trajectory easier to read?",
  },
  {
    id: "trend-split",
    name: "Trend · side summary",
    family: "trend",
    question: "Does a side summary make the latest result easier to judge?",
  },
  {
    id: "actions-columns",
    name: "Actions · columns",
    family: "actions",
    question: "The existing composition, using exactly the same Commitments.",
  },
  {
    id: "actions-rows",
    name: "Actions · rows",
    family: "actions",
    question: "Are longer outcomes and checkpoints easier to scan in rows?",
  },
]

function initialSelection() {
  const query = new URLSearchParams(window.location.search)
  return {
    variant:
      variants.find((entry) => entry.id === query.get("variant"))?.id ??
      "trend-wide",
    trend:
      trendFixtures.find((entry) => entry.id === query.get("trend"))?.id ??
      "recovery",
    actions:
      actionFixtures.find((entry) => entry.id === query.get("actions"))?.id ??
      "three",
    size: query.get("size") === "1280" ? 1280 : 800,
  }
}

type Selection = ReturnType<typeof initialSelection>

function PrototypeStage({ selection }: { selection: Selection }) {
  const trend = trendFixtures.find((entry) => entry.id === selection.trend)!
  const actions = actionFixtures.find(
    (entry) => entry.id === selection.actions
  )!
  if (selection.variant.startsWith("trend-")) {
    return (
      <TrendPrototype
        fixture={trend}
        split={selection.variant === "trend-split"}
      />
    )
  }
  if (selection.variant === "actions-rows") {
    return <ActionsRowsPrototype page={actions.page} />
  }
  return (
    <NextActionsSlide
      page={actions.page}
      context={{
        weekLabel: "2026-09-21 — 2026-09-25",
        pageLabel: "",
        showPageNumber: false,
      }}
    />
  )
}

function FixtureDetails({ selection }: { selection: Selection }) {
  const fixture = selection.variant.startsWith("trend-")
    ? trendFixtures.find((entry) => entry.id === selection.trend)!
    : actionFixtures.find((entry) => entry.id === selection.actions)!
  const data =
    "values" in fixture
      ? {
          ...fixture,
          observations: weekLabels(fixture).map((week, index) => ({
            week,
            value: fixture.values[index],
          })),
        }
      : fixture.page
  return (
    <details className="prototype-fixture-data">
      <summary>Inspect scenario data</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  )
}

export default function LayoutPrototype() {
  const [selection, setSelection] = useState(initialSelection)
  const active = variants.find((entry) => entry.id === selection.variant)!
  const activeIndex = variants.indexOf(active)
  const isTrend = active.family === "trend"
  const scenarios = isTrend ? trendFixtures : actionFixtures

  function changeVariant(step: number) {
    setSelection((current) => {
      const index = variants.findIndex((entry) => entry.id === current.variant)
      return {
        ...current,
        variant:
          variants[(index + step + variants.length) % variants.length].id,
      }
    })
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    query.set("prototype", "layouts")
    for (const [key, value] of Object.entries(selection))
      query.set(key, String(value))
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${query}`
    )
  }, [selection])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return
      if (
        event.target instanceof Element &&
        event.target.closest("input, textarea, select, [contenteditable]")
      )
        return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      changeVariant(event.key === "ArrowRight" ? 1 : -1)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="layout-prototype">
      <header className="prototype-header">
        <div>
          <strong>Weekly Workshop</strong>
          <span className="prototype-badge">Layout prototype</span>
        </div>
        <a href="/">Open workshop</a>
      </header>
      <div className="prototype-workspace">
        <aside className="prototype-sidebar" aria-label="Prototype controls">
          <h1>Layout study</h1>
          <p className="prototype-intro">
            Compare structure with the same content. All scenarios use fictional
            data.
          </p>
          <nav className="prototype-view-list" aria-label="Layout views">
            {variants.map((variant, index) => (
              <button
                key={variant.id}
                aria-current={
                  variant.id === selection.variant ? "page" : undefined
                }
                onClick={() =>
                  setSelection({ ...selection, variant: variant.id })
                }
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {variant.name}
              </button>
            ))}
          </nav>
          <label
            className="prototype-control-label"
            htmlFor="prototype-scenario"
          >
            Scenario
          </label>
          <select
            id="prototype-scenario"
            value={isTrend ? selection.trend : selection.actions}
            onChange={(event) =>
              setSelection({
                ...selection,
                [isTrend ? "trend" : "actions"]: event.target.value,
              })
            }
          >
            {scenarios.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.name}
              </option>
            ))}
          </select>
          <fieldset className="prototype-size-control">
            <legend>Stage size</legend>
            {[800, 1280].map((size) => (
              <Button
                key={size}
                size="sm"
                variant={selection.size === size ? "default" : "outline"}
                aria-pressed={selection.size === size}
                onClick={() => setSelection({ ...selection, size })}
              >
                {size} × {(size * 9) / 16}
              </Button>
            ))}
          </fieldset>
          <section className="prototype-review-prompts">
            <h2>Review in two ways</h2>
            <p>
              <strong>Present:</strong> Can the audience find the point while
              listening?
            </p>
            <p>
              <strong>Read:</strong> Can someone understand the evidence without
              a speaker?
            </p>
          </section>
          <p className="prototype-footnote">
            Prepared scenarios only. No changes are saved to week files.
          </p>
        </aside>
        <main className="prototype-main">
          <div className="prototype-view-description" aria-live="polite">
            <h2>{active.name}</h2>
            <p>{active.question}</p>
          </div>
          <div
            className="prototype-stage-scroll"
            tabIndex={0}
            aria-label="Slide preview; scroll to see the full stage"
          >
            <div className="prototype-canvas" style={{ width: selection.size }}>
              <StageFrame>
                <PrototypeStage selection={selection} />
              </StageFrame>
            </div>
          </div>
          <p className="prototype-size-note">
            {selection.size} × {(selection.size * 9) / 16} CSS pixels · Scroll
            the preview if it is wider than the window.
          </p>
          <FixtureDetails selection={selection} />
        </main>
      </div>
      <nav className="prototype-switcher" aria-label="Switch prototype view">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous view"
          onClick={() => changeVariant(-1)}
        >
          ←
        </Button>
        <span aria-live="polite">
          <b>{String.fromCharCode(65 + activeIndex)}</b> {active.name}
          <small>
            {activeIndex + 1} / {variants.length}
          </small>
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next view"
          onClick={() => changeVariant(1)}
        >
          →
        </Button>
      </nav>
    </div>
  )
}
