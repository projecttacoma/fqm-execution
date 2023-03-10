library Test

using FHIR version '4.0.1'

include FHIRHelpers version '4.1.000' called FHIRHelpers

parameter "Measurement Period" Interval<DateTime>

context Patient

define "sixty-six":
  66

define "ipop":
  AgeInYearsAt(date from start of "Measurement Period") >= "sixty-six"

define "denom":
  true

define "numer":
  false