import { WorkshopShell } from "@/components/workshop/workshop-shell"
import { httpWeekStore } from "@/lib/week-store"

export function App() {
  return <WorkshopShell weekStore={httpWeekStore} />
}

export default App
