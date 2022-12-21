library RatioEncounterReuseObservation version '0.0.002'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

parameter "Measurement Period" Interval<DateTime>

context Patient

define "ipp":
  ["Encounter"] E where E.period.start during "Measurement Period"
 
define "denom":
  ["Encounter"] E where E.period.end during "Measurement Period" and E.status = 'finished'

define "numer":
  "ipp"

define function daysObs(e Encounter):
  duration in days of e.period

define function hoursObs(e Encounter):
  duration in hours of e.period
