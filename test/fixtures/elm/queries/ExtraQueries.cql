/* Extra queries that may have ELM chunks used for QueryFilterParsing tests. */
library ExtraQueries version '0.0.1'

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

parameter "Index Date" Interval<DateTime>

context Patient

define "Function Result is not null":
  [Condition: "test-vs"] C
    where Global."Normalize Interval"(C.abatement) is not null

define "Random Interval Param end is not null":
  [Condition: "test-vs"] C
    where end of "Index Date" is not null

define "Not True":
  not true

define "FunctionRef In Same library":
  [Condition: "test-vs"] C
    where "A Function"(Global."Normalize Interval"(C.abatement)) during "Measurement Period"

define "FunctionRef With More Complexity in parameter":
  [Condition: "test-vs"] C
    where Global."Normalize Interval"("Passthrough"(C).abatement) during "Measurement Period"

define "Equivalent with Parameter":
  [Condition: "test-vs"] C
    where C.onset ~ "Measurement Period"

define "Encounter Starts 2 Years Or Less Before MP":
  [Encounter: "test-vs"] Enc
    where Global."Normalize Interval"(Enc.period) starts 2 years or less before end of "Measurement Period"

define "Encounter In MP":
  [Encounter: "test-vs"] Enc
    where Global."Normalize Interval"(Enc.period) in "Measurement Period"

define "Function call in Interval":
  [Encounter: "test-vs"] Enc
    where "Interval From Period"(Enc.period) in Interval[@2019-01-01T00:00:00.0, @2020-01-01T00:00:00.0)

define "GreaterThanOrEqual Birthdate at start of Observation":
	[Observation: "test-vs"] HPVTest
    where Global."CalendarAgeInYearsAt"(FHIRHelpers.ToDate(Patient.birthDate), start of Global."Normalize Interval"(HPVTest.effective))>= 30

define function "A Function"(period Interval<DateTime>):
  start of period

define function "Passthrough"(cond Condition):
  cond

define function "Interval From Period"(period FHIR.Period):
  Global."Normalize Interval"(period)