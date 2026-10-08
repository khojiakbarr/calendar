import { useEffect, useRef, useState } from "react"

type CopyState = "idle" | "copied" | "failed"

/** How long "Copied" stays before the button reads "Copy" again. */
const CONFIRM_MS = 2000

const LABEL: Record<CopyState, string> = { idle: "Copy", copied: "Copied", failed: "Copy failed" }

/**
 * Copies a code block's source to the clipboard and says whether it worked.
 *
 * The result is spoken through the button's own text inside a polite live
 * region rather than a toast: the button is where the user is looking, and a
 * refusal (clipboard permission, an insecure origin) has to be as visible as
 * success or the user pastes whatever was there before.
 *
 * @param props.text - The exact text to put on the clipboard.
 * @param props.what - Names the block for a screen reader ("tsx code").
 *
 * @example
 * <CopyButton text={source} what="tsx code" />
 */
export function CopyButton({ text, what }: { text: string; what: string }) {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleCopy = async () => {
    window.clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
    timer.current = window.setTimeout(() => setState("idle"), CONFIRM_MS)
  }

  return (
    <button type="button" className="docs-copy" data-state={state} onClick={handleCopy}>
      {/* The visible word leads the accessible name (WCAG 2.5.3); the hidden half says which Copy this is. */}
      <span aria-live="polite">{LABEL[state]}</span> <span className="site-sr-only">{what}</span>
    </button>
  )
}
