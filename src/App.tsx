import { WorkshopShell } from "@/components/workshop/workshop-shell"
import { httpDeckStore } from "@/lib/deck-store"

export function App() {
  return <WorkshopShell deckStore={httpDeckStore} />
}

export default App
