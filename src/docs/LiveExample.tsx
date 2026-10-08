import type { ReactNode } from "react"
import { CodeBlock } from "./CodeBlock"
import { consumerSource } from "./consumerSource"

interface LiveExampleProps {
  /** Names the example for assistive tech and captions the code. */
  title: string
  /** What to try, in a sentence. */
  hint?: string
  /** The running example. */
  children: ReactNode
  /** The example's own module source, imported with `?raw`. */
  source: string
  /** The example's file name, shown over the code. */
  file: string
}

/**
 * A running calendar with the code that produced it underneath.
 *
 * `source` is the example module itself, imported as text — so the code on the
 * page is the code running above it (bar the import specifier, see
 * {@link consumerSource}), and a library change that broke the example would
 * break the page's build rather than leave a snippet quietly lying.
 *
 * @example
 * <LiveExample title="A first calendar" source={quickStartSource} file="QuickStartExample.tsx">
 *   <QuickStartExample />
 * </LiveExample>
 */
export function LiveExample({ title, hint, children, source, file }: LiveExampleProps) {
  return (
    <figure className="docs-live">
      <figcaption className="docs-live-caption">
        <span className="docs-live-badge">Live</span>
        {title}
      </figcaption>
      {hint ? <p className="docs-live-hint">{hint}</p> : null}
      <div className="docs-live-stage">{children}</div>
      <CodeBlock code={consumerSource(source)} language="tsx" title={file} />
    </figure>
  )
}
