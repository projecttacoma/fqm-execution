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