import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { DocsPage } from "./DocsPage"
import "../styles/index.css"
import "../demo/site.css"
import "./docs.css"

const container = document.getElementById("root")
if (!container) throw new Error("Missing #root element")

createRoot(container).render(
  <StrictMode>
    <DocsPage />
  </StrictMode>,
)
