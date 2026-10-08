import type { DocSection } from "../model"
import { accessibility } from "./accessibility"
import { apiReference } from "./apiReference"
import { events } from "./events"
import { gettingStarted } from "./gettingStarted"
import { host } from "./host"
import { labels } from "./labels"
import { resources } from "./resources"
import { serverSide } from "./serverSide"
import { theming } from "./theming"
import { views } from "./views"

/**
 * The whole docs page, in reading order.
 *
 * The sidebar, the on-this-page list and the body are all rendered from this
 * one array, so adding a topic here is the only step there is.
 */
export const DOC_SECTIONS: DocSection[] = [
  gettingStarted,
  serverSide,
  views,
  events,
  resources,
  host,
  theming,
  labels,
  accessibility,
  apiReference,
]
