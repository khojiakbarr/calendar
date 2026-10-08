import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import * as publicApi from "../index"
import indexSource from "../index.ts?raw"
import { DocsPage } from "./DocsPage"
import { DOC_SECTIONS } from "./sections"

/**
 * The docs page's promises, as tests: every link lands somewhere, and the code
 * it shows names nothing the package does not export and no token the
 * stylesheet does not declare. A docs page that drifts from the code does so
 * silently — nobody runs a snippet until they need it — so the drift has to be
 * caught here.
 */

// Read from disk: Vitest does not process CSS, so a `?raw` import of it arrives empty.
const tokensSource = readFileSync(resolve(__dirname, "../styles/tokens.css"), "utf8")

const PACKAGE_IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*"@hojiakbar_dev\/calendar"/g

/** Every name a code block on the page imports from the package, and whether it was a `type` import. */
function importedNames(container: HTMLElement): { name: string; isType: boolean }[] {
  const code = [...container.querySelectorAll("pre")].map((pre) => pre.textContent ?? "").join("\n")
  return [...code.matchAll(PACKAGE_IMPORT)].flatMap(([, whole, list = ""]) =>
    list
      .replace(/\/\/[^\n]*/g, "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => ({ name: entry.replace(/^type\s+/, ""), isType: whole !== undefined || entry.startsWith("type ") })),
  )
}

describe("docs page", () => {
  it("gives every section and topic a unique id", () => {
    const ids = DOC_SECTIONS.flatMap((section) => [section.id, ...section.topics.map((topic) => topic.id)])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("resolves every in-page link to an element on the page", () => {
    const { container } = render(<DocsPage />)
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
    // A guard on the guard: the sidebar alone links every topic.
    expect(links.length).toBeGreaterThan(40)
    for (const link of links) {
      const id = link.getAttribute("href")!.slice(1)
      expect(document.getElementById(id), `#${id} has no target`).not.toBeNull()
    }
  })

  it("lists every section and topic in the sidebar", () => {
    render(<DocsPage />)
    const sidebar = screen.getByRole("navigation", { name: "Documentation" })
    for (const section of DOC_SECTIONS) {
      expect(within(sidebar).getByRole("link", { name: section.title })).toHaveAttribute("href", `#${section.id}`)
      for (const topic of section.topics) {
        expect(within(sidebar).getByRole("link", { name: topic.title })).toHaveAttribute("href", `#${topic.id}`)
      }
    }
  })

  it("imports only names the package exports", () => {
    const { container } = render(<DocsPage />)
    const names = importedNames(container)
    expect(names.length).toBeGreaterThan(40)
    for (const { name, isType } of names) {
      if (isType) {
        // Types leave nothing at runtime; the entry point's source still has to name them.
        expect(indexSource, `type ${name} is not exported`).toMatch(new RegExp(`\\b${name}\\b`))
      } else {
        expect(publicApi, `${name} is not exported`).toHaveProperty(name)
      }
    }
  })

  it("names only style tokens the stylesheet declares", () => {
    const { container } = render(<DocsPage />)
    const tokens = new Set(container.textContent?.match(/--cal-[a-z-]+[a-z]/g) ?? [])
    expect(tokens.size).toBeGreaterThan(25)
    for (const token of tokens) {
      expect(tokensSource, `${token} is not in tokens.css`).toContain(`${token}:`)
    }
  })

  it("renders a running calendar in every live example", () => {
    const { container } = render(<DocsPage />)
    const figures = screen.getAllByRole("figure")
    expect(figures).toHaveLength(12)
    for (const figure of figures) {
      expect(within(figure).getByRole("button", { name: /^Copy / })).toBeInTheDocument()
    }
    expect(container.querySelectorAll(".docs-live-stage .cal-root")).toHaveLength(figures.length)
  })

  it("shows examples under the package's name, not the checkout's alias", () => {
    const { container } = render(<DocsPage />)
    const code = [...container.querySelectorAll("pre")].map((pre) => pre.textContent ?? "").join("\n")
    expect(code).toContain('from "@hojiakbar_dev/calendar"')
    expect(code).not.toContain('"@/index"')
  })

  it("links back to the live preview from the masthead", () => {
    render(<DocsPage />)
    const nav = screen.getByRole("navigation", { name: "Site" })
    expect(within(nav).getByRole("link", { name: "Preview" })).toHaveAttribute("href", "/")
    expect(within(nav).getByRole("link", { name: "Docs" })).toHaveAttribute("aria-current", "page")
  })

  it("opens the Contents list from the keyboard and closes it with Escape", async () => {
    // jsdom has no layout, so no scrollIntoView; the list calls it on open.
    Element.prototype.scrollIntoView = vi.fn()
    const user = userEvent.setup()
    render(<DocsPage />)
    const toggle = screen.getByRole("button", { name: "Contents" })

    toggle.focus()
    await user.keyboard("{Enter}")
    expect(toggle).toHaveAttribute("aria-expanded", "true")

    await user.tab()
    await user.keyboard("{Escape}")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveFocus()
  })
})
