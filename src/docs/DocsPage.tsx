import { useEffect, useMemo } from "react"
import { SiteHeader } from "../demo/SiteHeader"
import { DocsContent } from "./DocsContent"
import { DocsSidebar } from "./DocsSidebar"
import type { DocSection } from "./model"
import { OnThisPage } from "./OnThisPage"
import { DOC_SECTIONS } from "./sections"
import { useActiveHeading } from "./useActiveHeading"

/** Every anchor on the page in document order, and which section each belongs to. */
function indexAnchors(sections: DocSection[]) {
  const ids: string[] = []
  const sectionOf = new Map<string, DocSection>()
  for (const section of sections) {
    ids.push(section.id)
    sectionOf.set(section.id, section)
    for (const topic of section.topics) {
      ids.push(topic.id)
      sectionOf.set(topic.id, section)
    }
  }
  return { ids, sectionOf }
}

/**
 * Scrolls to the fragment in the address once the content exists.
 *
 * The browser tries on load, before React has rendered a single heading, and
 * finds nothing — so a reload of `docs.html#theming`, or a link shared from the
 * sidebar, would otherwise land at the top of the page.
 */
function useInitialFragment() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    // Instant, not the page's smooth scrolling: arriving at a link is not a movement the reader asked to watch.
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "instant" })
  }, [])
}

/**
 * The documentation page: the site masthead, a sidebar of sections, the content,
 * and an on-this-page list on wide screens.
 *
 * One static page with fragment links rather than a client-side router: GitHub
 * Pages serves files and has no SPA fallback, so `docs.html#theming` survives a
 * hard reload where `/docs/theming` would 404.
 *
 * @example
 * createRoot(root).render(<DocsPage />)
 */
export function DocsPage() {
  const { ids, sectionOf } = useMemo(() => indexAnchors(DOC_SECTIONS), [])
  const activeId = useActiveHeading(ids)
  const activeSection = activeId === undefined ? undefined : sectionOf.get(activeId)
  const activeTopicId = activeId !== undefined && activeId !== activeSection?.id ? activeId : undefined
  useInitialFragment()

  return (
    <div className="docs-root">
      <a className="docs-skip" href="#docs-main">
        Skip to content
      </a>
      <SiteHeader page="docs" />
      <div className="docs-layout">
        <DocsSidebar sections={DOC_SECTIONS} activeSectionId={activeSection?.id} activeTopicId={activeTopicId} />
        <main className="docs-main" id="docs-main" tabIndex={-1}>
          <header className="docs-intro">
            <p className="docs-eyebrow">Documentation</p>
            <h1 className="docs-title">A React calendar that keeps its events on your server</h1>
            <p className="docs-lede">
              The calendar asks your server for the range on screen, caches what it has, and applies every drag, resize and
              edit optimistically — rolling back if the server says no. Start with <a href="#quick-start">your first calendar</a>,
              or open the <a href="./">live preview</a> to try every view against a mock server.
            </p>
          </header>
          <DocsContent sections={DOC_SECTIONS} />
        </main>
        <OnThisPage section={activeSection} activeTopicId={activeTopicId} />
      </div>
    </div>
  )
}
