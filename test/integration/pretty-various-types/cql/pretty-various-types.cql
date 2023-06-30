library Pretty version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

parameter "Measurement Period" Interval<DateTime>

context Patient

define "ipop":
  true

define "denom":
  true

define "numer":
  "Kitchen Sink" is not null

define "FHIR Encounter List":
  [Encounter]

define "FHIR Observation List":
  [Observation]

define "FHIR Encounter Single":
  First([Encounter])

define "FHIR CodeableConcept":
  First(First([Encounter]).type)

define "FHIR Coding":
  First(First([Encounter]).type.coding)

define "FHIR DateTime":
  First([Encounter]).period.start

define "FHIR Date":
  Patient.birthDate

define "FHIR Period":
  First([Encounter]).period

define "FHIR code":
  First([Encounter]).status

define "FHIR duration":
  First([Encounter]).length

define "FHIR Identifier":
  First(Patient.identifier)

define "FHIR Reference":
  First([Encounter]).subject

define "FHIR String":
  First(Patient.name).family

define "FHIR Ratio":
  First([Observation]).value

define "System Code":
    Code { code: 'asdf', system: 'http://example.com', display: 'A S D F' }

define "System Interval":
  "Measurement Period"

define "System DateTime":
  start of "Measurement Period"

define "System Tuple":
  [Encounter] E return {
    id: E.id
  }

define "Kitchen Sink":
  {
     fhirEncounterList: "FHIR Encounter List",
     fhirEncounterSingle: "FHIR Encounter Single",
     fhirCodeableConcept: "FHIR CodeableConcept",
     fhirCoding: "FHIR Coding",
     fhirDateTime: "FHIR DateTime",
     fhirDate: "FHIR Date",
     fhirPeriod: "FHIR Period",
     fhirCode: "FHIR code",
     fhirDuration: "FHIR duration",
     fhirIdentifier: "FHIR Identifier",
     fhirReference: "FHIR Reference",
     fhirString: "FHIR String",
     fhirRatio: "FHIR Ratio",
     systemCode: "System Code",
     systemInterval: "System Interval",
     systemDateTime: "System DateTime",
     systemTyple: "System Tuple"
  }