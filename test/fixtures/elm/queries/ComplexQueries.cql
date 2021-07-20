library ComplexQueries version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'
include MATGlobalCommonFunctions version '5.0.000' called Global

codesystem "EXAMPLE": 'http://example.com'
codesystem "EXAMPLE-2": 'http://example.com/2'
codesystem "ConditionClinicalStatusCodes": 'http://terminology.hl7.org/CodeSystem/condition-clinical'

valueset "test-vs": 'http://example.com/test-vs'

code "test-code": 'test' from "EXAMPLE"
code "test-code-2": 'test-2' from "EXAMPLE-2"

code "Active": 'active' from "ConditionClinicalStatusCodes"
code "Recurrence": 'recurrence' from "ConditionClinicalStatusCodes"
code "Relapse": 'relapse' from "ConditionClinicalStatusCodes"

concept "test-concept": { "test-code", "test-code-2" } display 'test-concept'

concept "Condition Active": { "Active", "Recurrence", "Relapse" } display 'Active'

parameter "Measurement Period" Interval<DateTime>
  default Interval[@2019-01-01T00:00:00.0, @2020-01-01T00:00:00.0)

context Patient

define "Code And Starts During MP":
  [Condition: "test-vs"] C
    where C.clinicalStatus ~ "Condition Active"
      and C.onset during "Measurement Period"

define "Observation Status Value Exists and During MP":
  [Observation: "test-vs"] Obs
    where Obs.status in {'final', 'amended', 'corrected', 'preliminary'}
      and Obs.value is not null
      and Global."Normalize Interval"(Obs.effective) during "Measurement Period"

define "Encounter 2 Years Before End of MP":
  [Encounter: "test-vs"] Enc
    where Global."Normalize Interval"(Enc.period) ends 2 years or less before end of "Measurement Period"

define "Code Active Or Starts During MP Or Abatement is not null":
  [Condition: "test-vs"] C
    where C.clinicalStatus ~ "Condition Active"
      or C.onset during "Measurement Period"
      or C.abatement is not null

define "Observation Status and Value":
  [Observation: "test-vs"] Obs
    where Obs.status in {'final', 'amended', 'corrected', 'preliminary'}
      and Obs.value is not null

define "Further Refine Observation With During MP":
  "Observation Status and Value" O
    where Global."Normalize Interval"(O.effective) during "Measurement Period"

define "Further Refine Observation With During MP and bodySite":
  "Observation Status and Value" O
    where Global."Normalize Interval"(O.effective) during "Measurement Period"
      and O.bodySite is not null