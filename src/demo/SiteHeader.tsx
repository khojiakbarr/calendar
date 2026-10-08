/**
 * The site's two pages. Plain files rather than routes: GitHub Pages has no
 * SPA fallback, so a path it cannot find on disk is a 404 on reload. Built from
 * `BASE_URL` because a string literal in JSX gets no `base` rewrite from Vite —
 * `/docs.html` would work on localhost and 404 under `/calendar/`.
 */
const PAGE_URL = {
  preview: import.meta.env.BASE_URL,
  docs: `${import.meta.env.BASE_URL}docs.html`,
} as const

const GITHUB_URL = "https://github.com/khojiakbarr/calendar"
const NPM_URL = "https://www.npmjs.com/package/@hojiakbar_dev/calendar"

/** Which page of the site a masthead sits on. */
export type SitePage = keyof typeof PAGE_URL

/** The calendar glyph beside the package name; decorative, so hidden from assistive tech. */
function Mark() {
  return (
    <svg className="site-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="26" height="24" rx="5" fill="#2563eb" />
      <rect x="3" y="5" width="26" height="8" rx="4" fill="#1d4ed8" />
      <circle cx="11" cy="20" r="2.2" fill="#fff" />
      <circle cx="21" cy="20" r="2.2" fill="#fff" fillOpacity="0.6" />
    </svg>
  )
}

/** The arrow every outbound link carries, so "GitHub" reads as leaving the site. */
function ExternalArrow() {
  return (
    <svg className="site-link-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M4 2.5h5.5V8M9.2 2.8 2.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The masthead both pages share: the package name, a link between the live
 * preview and the docs (the current one marked `aria-current="page"`), and the
 * two places a visitor from a README wants next.
 *
 * It holds no `<h1>`: each page owns its heading, so the preview and the docs
 * each have exactly one.
 *
 * @param props.page - The page this masthead sits on.
 *
 * @example
 * <SiteHeader page="docs" />
 */
export function SiteHeader({ page }: { page: SitePage }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-brand" href={PAGE_URL.preview}>
          <Mark />
          @hojiakbar_dev/calendar
        </a>
        <nav className="site-nav" aria-label="Site">
          <a href={PAGE_URL.preview} aria-current={page === "preview" ? "page" : undefined}>
            Preview
          </a>
          <a href={PAGE_URL.docs} aria-current={page === "docs" ? "page" : undefined}>
            Docs
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
            <ExternalArrow />
            <span className="site-sr-only">(opens in a new tab)</span>
          </a>
          <a href={NPM_URL} target="_blank" rel="noopener noreferrer">
            npm
            <ExternalArrow />
            <span className="site-sr-only">(opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
