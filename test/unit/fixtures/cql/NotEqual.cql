library Test

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'
include MATGlobalCommonFunctions version '5.0.000' called Global

codesystem "EXAMPLE": 'http://example.com'
codesystem "EXAMPLE-2": 'http://example.com/2'
codesystem "ConditionClinicalStatusCodes": 'http://terminology.hl7.org/CodeSystem/condition-clinical'

valueset "test-vs": 'http://example.com/test-vs'

code "Active": 'active' from "ConditionClinicalStatusCodes"
code "Recurrence": 'recurrence' from "ConditionClinicalStatusCodes"
code "Relapse": 'relapse' from "ConditionClinicalStatusCodes"

concept "Condition Active": { "Active", "Recurrence", "Relapse" } display 'Active'

context Patient

define "Not Equal Clause":
    [Condition: "test-vs"] C
        where C.id != 'notId'