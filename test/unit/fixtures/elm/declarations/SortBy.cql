library SortClauseInQiCore version '0.0.000'

using QICore version '4.1.1'

include FHIRHelpers version '4.0.1'

parameter "Measurement Period" Interval<DateTime>

context Patient

define "SortByTest":
  ( ["Encounter"] Encounter
      return all {
        periodStart: start of Encounter.period
      }
      sort by periodStart
  ).periodStart

define "Encounter Presence":
  [Encounter]