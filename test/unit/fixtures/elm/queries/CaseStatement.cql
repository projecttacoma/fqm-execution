library Test

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

context Patient

define "First Observation":
    First([Observation])

define "Case":
    case 
        when "First Observation".value > 10 then true
        when "First Observation".value < 10 then false
        else null
    end