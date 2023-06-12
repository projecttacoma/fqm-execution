library SimpleAliasFunctionRef version '0.0.1'

using QICore version '4.1.1'

include FHIRHelpers version '4.1.000' called FHIRHelpers

parameter "Measurement Period" Interval<DateTime>

context Patient

define "Some Encounter":
  [Encounter] MyEncounter where MyEncounter.period.example()

define "ipop":
  true

define "denom":
  true

define "numer":
  exists "Some Encounter"

define fluent function example(P Interval<DateTime>):
  true

