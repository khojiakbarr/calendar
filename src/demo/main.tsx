import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Demo } from "./Demo"
import "../styles/index.css"
import "./demo.css"

const container = document.getElementById("root")
if (!container) throw new Error("Missing #root element")

createRoot(container).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)
