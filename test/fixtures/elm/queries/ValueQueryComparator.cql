library ValueQuery version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

valueset "test-vs": 'http://example.com/test-vs'

define "Has Elevated Value":
  ("ObsQuery".value as Quantity) > 9 '%'

define "ObsQuery":
  Last (
    [Observation: "test-vs"] O
      where O.status in {'final', 'amended', 'corrected'}
  )