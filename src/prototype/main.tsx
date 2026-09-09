import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/styles/stage.css"
import "@/prototype/prototype.css"
import { PrototypeApp } from "@/prototype/prototype-app"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrototypeApp />
  </StrictMode>
)
