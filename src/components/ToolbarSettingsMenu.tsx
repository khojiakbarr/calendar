import { useRef, useState } from "react"
import type { CalendarInstance } from "../instance"
import type { CalendarLabels } from "../types"
import { useOutsideClose } from "./useOutsideClose"

interface ToolbarSettingsMenuProps<TData = unknown> {
  instance: CalendarInstance<TData>
  labels: CalendarLabels
}

/**
 * The toolbar's ⋮ settings button and the small menu it opens.
 *
 * Split out from {@link Toolbar} so the open/closed state and its
 * outside-click/Escape wiring live next to the one control that needs them,
 * rather than making every toolbar render carry menu-only state.
 */
export function ToolbarSettingsMenu<TData = unknown>({ instance, labels }: ToolbarSettingsMenuProps<TData>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)
  useOutsideClose(ref, close, open)

  return (
    <div className="cal-toolbar-settings" ref={ref}>
      <button
        type="button"
        className="cal-icon-btn"
        aria-label={labels.settings}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ⋮
      </button>
      {open ? (
        <div className="cal-menu" role="menu">
          <label className="cal-menu-item">
            <input
              type="checkbox"
              className="cal-checkbox"
              checked={instance.showWeekends}
              onChange={(event) => instance.setShowWeekends(event.target.checked)}
            />
            {labels.showWeekends}
          </label>
        </div>
      ) : null}
    </div>
  )
}
