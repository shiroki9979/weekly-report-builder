import { lazy, Suspense } from "react"
import { WorkshopShell } from "@/components/workshop/workshop-shell"
import { httpWeekStore } from "@/lib/week-store"

const LayoutPrototype = import.meta.env.DEV
  ? lazy(() => import("@/components/stage/prototype/layout-prototype"))
  : null

export function App() {
  if (
    LayoutPrototype &&
    new URLSearchParams(window.location.search).get("prototype") === "layouts"
  ) {
    return (
      <Suspense fallback={<p>Loading layout prototype…</p>}>
        <LayoutPrototype />
      </Suspense>
    )
  }
  return <WorkshopShell weekStore={httpWeekStore} />
}

export default App
