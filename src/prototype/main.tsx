// PROTOTYPE — 三個主題表現（A Rule／B Observatory／C Block）× 五頁，於 /prototype.html 以 ?variant=&page=&lang= 切換；不進 production
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/styles/stage.css"
import "@/styles/editorial-layouts.css"
import "./prototype.css"
import "./variant-a.css"
import "./variant-b.css"
import "./variant-c.css"

import { Prototype } from "./prototype-app"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Prototype />
  </StrictMode>
)
