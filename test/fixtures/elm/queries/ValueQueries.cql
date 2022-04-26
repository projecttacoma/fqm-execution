library ValueQuery version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

valueset "test-vs": 'http://example.com/test-vs'

context Patient

define "Query ExpressionRef with Value Comparison":
  ("Simple Observation Query".value as Quantity) > 9 '%'

define "Simple Observation Query":
    Last([Observation: "test-vs"] O
      where O.status in {'final', 'amended', 'corrected'})

define "Has Elevated Value With Where":
    Last([Observation: "test-vs"] O
      where O.status in {'final', 'amended', 'corrected'}
      and (O.value as Quantity) > 9 '%')
