library QICoreQuery

using QICore version '4.1.1'

include FHIRHelpers version '4.0.1'

codesystem "EXAMPLE": 'http://example.com'

valueset "test-vs": 'http://example.com/test-vs'

context Patient

define "Query":
    [Encounter] ValidEncounter where ValidEncounter.reasonCode in "test-vs"