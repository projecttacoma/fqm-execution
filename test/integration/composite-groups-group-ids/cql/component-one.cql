library GroupComponentOne version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

parameter "Measurement Period" Interval<DateTime>

context Patient

define "Initial Population":
    true

define "Denominator":
    true

define "Numerator 1":
    exists [Procedure]

define "Numerator 2":
    exists [Encounter]