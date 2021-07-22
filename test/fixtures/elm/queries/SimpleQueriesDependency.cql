library SimpleDep version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

valueset "test-vs-2": 'http://example.com/test-vs-2'

define "SimpleRetrieve":
  [Condition: "test-vs-2"]


define "SimpleQuery":
  [Procedure: "test-vs-2"] P
    where P.id = 'test-2' 

