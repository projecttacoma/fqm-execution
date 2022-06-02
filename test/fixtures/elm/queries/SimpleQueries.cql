library SimpleQueries version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'
include SimpleDep version '0.0.1'

codesystem "EXAMPLE": 'http://example.com'
codesystem "EXAMPLE-2": 'http://example.com/2'

valueset "test-vs": 'http://example.com/test-vs'

code "test-code": 'test' from "EXAMPLE"
code "test-code-2": 'test-2' from "EXAMPLE-2"

concept "test-concept": { "test-code", "test-code-2" } display 'test-concept'

define "SimpleVSRetrieve":
  [Condition: "test-vs"]

define "SimpleCodeRetrieve":
  [Procedure: "test-code"]

define "SimpleQuery":
  [Condition: "test-vs"] C where C.id = 'test'

define "SimpleExpressionRef":
  "SimpleVSRetrieve"

define "DepExpressionRef":
  "SimpleDep"."SimpleRetrieve"

define "SimpleConceptRetrieve":
  [Procedure: "test-concept"]

define "Use Further Filtering":
  exists "Further Filtering Query"

define "Further Filtering Query":
  "Retrieve Query" P
    where P.outcome is not null

define "Retrieve Query":
  [Procedure: "test-vs"] P
    where P.status = 'completed'

define "Retrieve Using ValueSet In Dependency":
  [Procedure: SimpleDep."test-vs-2"] P
    where P.status = 'completed'

define "Nested Query From Another Library":
  SimpleDep."SimpleQuery" S
    where S.status = 'completed'

define "Last of Referenced Query is Null":
  Last("SimpleQuery").recordedDate is null