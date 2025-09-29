library Test

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

parameter "Measurement Period" Interval<DateTime>

context Patient

define "ipop":
  AgeInYearsAt(date from start of "Measurement Period") >= 66

define "denom":
  true

define "numer":
  false