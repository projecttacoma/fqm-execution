library ProportionBooleanTest version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

parameter "Measurement Period" Interval<DateTime>
  default Interval[@2022-01-01T00:00:00.0, @2022-12-31T00:00:00.0]

context Patient

define "ipp":
  null

define "denom":
  null

define "numer":
  null
