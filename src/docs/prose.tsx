import type { ReactNode } from "react"

const README_URL = "https://github.com/khojiakbarr/calendar#"

/**
 * A pointer to the README section that holds the long-form reasoning.
 *
 * The docs answer "how do I"; the README keeps the "why", and duplicating it
 * here would give the two a way to drift.
 *
 * @param props.anchor - The README heading's GitHub anchor, without the `#`.
 *
 * @example
 * <ReadMore anchor="preferences">Preferences</ReadMore>
 */
export function ReadMore({ anchor, children }: { anchor: string; children: ReactNode }) {
  return (
    <p className="docs-readmore">
      Why it works this way:{" "}
      <a href={`${README_URL}${anchor}`} target="_blank" rel="noopener noreferrer">
        README — {children} <span className="site-sr-only">(opens in a new tab)</span>
      </a>
    </p>
  )
}

/**
 * A short aside that must not be skimmed past — a rule that is easy to get
 * wrong, or a known limitation.
 *
 * @param props.tone - `"warning"` for something that bites; `"note"` otherwise.
 *
 * @example
 * <Callout tone="warning">Drag gestures have no keyboard equivalent yet.</Callout>
 */
export function Callout({ tone = "note", children }: { tone?: "note" | "warning"; children: ReactNode }) {
  return (
    <aside className="docs-callout" data-tone={tone}>
      <strong className="docs-callout-label">{tone === "warning" ? "Watch out" : "Note"}</strong>
      <div>{children}</div>
    </aside>
  )
}

/** One row of a {@link RefTable}: a name, then one cell per remaining column. */
export type RefRow = [name: string, ...cells: ReactNode[]]

/**
 * A reference table — options, props, fields, tokens — that scrolls sideways
 * inside its own box on a narrow screen rather than widening the page. The
 * first column is set as code, because it is always an API name; a name
 * written "a, b" is two names, one per line.
 *
 * @param props.head - Column headings; the first is the name column.
 * @param props.caption - Names the table for a screen reader.
 *
 * @example
 * <RefTable caption="Views" head={["View", "Covers"]} rows={[["day", "One day"]]} />
 */
export function RefTable({ head, rows, caption }: { head: string[]; rows: RefRow[]; caption: string }) {
  return (
    <div className="docs-table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className="docs-table">
        <caption className="site-sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, ...cells]) => (
            <tr key={name}>
              <th scope="row">
                {name.split(", ").map((part) => (
                  <code key={part} className="docs-table-name">
                    {part}
                  </code>
                ))}
              </th>
              {cells.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
