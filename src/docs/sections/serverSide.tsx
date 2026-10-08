import { CodeBlock } from "../CodeBlock"
import { consumerSource } from "../consumerSource"
import { OptimisticExample } from "../examples/OptimisticExample"
import optimisticSource from "../examples/OptimisticExample.tsx?raw"
import memorySource from "../examples/memorySource.ts?raw"
import { RangeLoadingExample } from "../examples/RangeLoadingExample"
import rangeSource from "../examples/RangeLoadingExample.tsx?raw"
import { ReadOnlyExample } from "../examples/ReadOnlyExample"
import readOnlySource from "../examples/ReadOnlyExample.tsx?raw"
import { LiveExample } from "../LiveExample"
import type { DocSection } from "../model"
import { Callout, ReadMore } from "../prose"

function EventSourceContract() {
  return (
    <>
      <p>
        The calendar never holds "all the events". It asks your server for the range on screen, keeps what it was
        given, and hands every edit back as it happens. Only <code>load</code> is required:
      </p>
      <CodeBlock
        language="ts"
        code={`
interface EventSource<TData = unknown> {
  load(range: DateRange, options: { signal: AbortSignal }): Promise<CalendarEvent<TData>[]>
  create?(draft: EventDraft<TData>): Promise<CalendarEvent<TData>>
  update?(id: string, patch: EventPatch<TData>, previous: CalendarEvent<TData>): Promise<CalendarEvent<TData>>
  remove?(id: string): Promise<void>
}`}
      />
      <p>
        <code>range</code> is half-open — <code>start</code> included, <code>end</code> not — and <code>load</code> must
        return every event that overlaps it. A REST adapter is a few lines; the wire format is ISO strings, and the
        calendar only ever sees <code>Date</code>s:
      </p>
      <CodeBlock
        language="tsx"
        code={`
const source: EventSource<Appointment> = {
  async load(range, { signal }) {
    const query = \`start=\${range.start.toISOString()}&end=\${range.end.toISOString()}\`
    const response = await fetch(\`/api/events?\${query}\`, { signal })
    if (!response.ok) throw new Error(\`Load failed: \${response.status}\`)
    return (await response.json()).map(fromApi) // ISO strings -> Dates
  },
  async update(id, patch) {
    const response = await fetch(\`/api/events/\${id}\`, { method: "PATCH", body: JSON.stringify(toApi(patch)) })
    if (!response.ok) throw new Error(\`Update failed: \${response.status}\`)
    return fromApi(await response.json())
  },
}`}
      />
      <Callout tone="warning">
        Pass the <code>signal</code> to <code>fetch</code>. The calendar aborts a request the moment its answer is no
        longer wanted, and a source that ignores the signal still works — the stale answer is dropped — but keeps the
        connection busy.
      </Callout>
      <p>
        Recurring events are the server's job: expand a series into the occurrences that overlap the range and return
        those. There is no <code>rrule</code> field, and two occurrences are just two events with different ids.
      </p>
      <ReadMore anchor="server-side-by-design">Server-side by design</ReadMore>
    </>
  )
}

function MemorySource() {
  return (
    <>
      <p>
        Every live example on this page runs against this in-memory source, with dates relative to today so they never
        look stale. It delays each call, honours the abort signal and can refuse a call — enough to see loading and
        rollback happen.
      </p>
      <CodeBlock language="ts" code={consumerSource(memorySource)} title="memorySource.ts" />
    </>
  )
}

function RangeLoading() {
  return (
    <>
      <p>
        Only the visible range is requested, widened to whole weeks first — so going from a week to one of its days, or
        paging day by day inside it, asks for nothing. Every range already loaded is kept, so returning to a month you
        have seen costs nothing. A new request aborts the one before it, and a response is applied only while it is
        still the newest.
      </p>
      <LiveExample
        title="Requests per range"
        hint="Page forward and back with ‹ ›: only a range the calendar has not seen reaches the source."
        source={rangeSource}
        file="RangeLoadingExample.tsx"
      >
        <RangeLoadingExample />
      </LiveExample>
      <p>
        <code>instance.reload()</code> forgets every cached range and fetches the current one again, for a manual
        refresh or a change made outside the calendar.
      </p>
    </>
  )
}

function OptimisticEdits() {
  return (
    <>
      <p>
        Every edit is drawn at once and undone precisely if the source rejects. A new event appears under a temporary id
        (<code>tmp:1</code>, <code>tmp:2</code>…) and is replaced by the server's in one update, so it never blinks out
        between the two. While an edit is in flight its id is in <code>instance.pendingIds</code>, for a "saving"
        style. Every rejection also reaches <code>onError(error, action)</code>, where <code>action</code> is{" "}
        <code>"load" | "create" | "update" | "remove"</code>.
      </p>
      <LiveExample
        title="Optimistic edits with rollback"
        hint="The source takes about a second. Tick the box, drag an event, and watch it jump back."
        source={optimisticSource}
        file="OptimisticExample.tsx"
      >
        <OptimisticExample />
      </LiveExample>
      <p>
        <code>createEvent</code>, <code>updateEvent</code> and <code>removeEvent</code> on the instance behave the same
        way and resolve to <code>null</code>, <code>null</code> and <code>false</code> when the source rejected.
      </p>
    </>
  )
}

function ReadOnlySources() {
  return (
    <>
      <p>
        Leave a method out and the matching gesture is simply not offered: no <code>create</code> means no
        drag-to-create and no "New event" button; no <code>update</code> means no move, no resize and no editor; no{" "}
        <code>remove</code> means no Delete. <code>features</code> can switch a gesture off further, but never on for a
        method the source does not have. A single event can be locked with <code>readOnly: true</code>.
      </p>
      <LiveExample
        title="A source with only load"
        hint="There is nothing to drag, and a click opens nothing."
        source={readOnlySource}
        file="ReadOnlyExample.tsx"
      >
        <ReadOnlyExample />
      </LiveExample>
    </>
  )
}

export const serverSide: DocSection = {
  id: "server-side",
  title: "Server-side by design",
  summary: "How events get in, how often the server is asked, and what happens when it says no.",
  topics: [
    { id: "event-source", title: "The EventSource contract", Body: EventSourceContract },
    { id: "memory-source", title: "The in-memory source", Body: MemorySource },
    { id: "range-loading", title: "Range loading", Body: RangeLoading },
    { id: "optimistic-edits", title: "Optimistic edits", Body: OptimisticEdits },
    { id: "read-only", title: "Read-only sources", Body: ReadOnlySources },
  ],
}
