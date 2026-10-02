import { WorkshopShell } from "@/components/workshop/workshop-shell"
import { httpWorkshopStore } from "@/lib/deck-store"

export function App() {
  return <WorkshopShell deckStore={httpWorkshopStore} />
}

export default App
