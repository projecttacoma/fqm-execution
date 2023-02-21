library ProportionBooleanTest version '0.0.2'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

valueset "Example": 'http://example.com/exampleId'
valueset "Example2": 'http://example.com/exampleId2'
valueset "Example3": 'http://example.com/exampleId3'

parameter "Measurement Period" Interval<DateTime>
  default Interval[@2022-01-01T00:00:00.0, @2022-12-31T00:00:00.0]

context Patient

define "ipp":
  exists [Procedure: "Example"] Example
		where Example.status = 'completed'

define "denom":
  exists [Procedure: "Example2"] Example2
		where Example2.status = 'completed'

define "numer":
  exists [Procedure: "Example3"] Example3
		where Example3.status = 'completed'

