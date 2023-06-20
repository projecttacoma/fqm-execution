library ProportionEncounterTuple version '0.0.004'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

codesystem "ActEncounterCode": 'http://terminology.hl7.org/CodeSystem/v3-ActCode'

valueset "Example": 'http://example.com/exampleId'

code "inpatient encounter": 'IMP' from "ActEncounterCode" display 'inpatient encounter'

parameter "Measurement Period" Interval<DateTime>

context Patient

define "ipp":
  [Encounter: "Example"] E
    where E.period.end during "Measurement Period"

define "denom":
  "ipp" E
    where E.period.start during "Measurement Period"
      and E.status = 'finished'

define "numer":
  "Enc with Durations" EncWithDurations
    where EncWithDurations.durationDays > 2
    return EncWithDurations.encounter

define "Enc with Durations":
  "denom" E
    return Tuple {
      encounter: E,
      durationDays: daysObs(E)
    }

define function daysObs(e Encounter):
  duration in days of e.period