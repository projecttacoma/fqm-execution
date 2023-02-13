library RatioEncounterFullyLoaded version 'null'

using FHIR version '4.0.1'

include FHIRHelpers version '1.0.000' called FHIRHelpers

parameter "Measurement Period" Interval<DateTime>

context Patient

define "ipp":
  ["Encounter"] E where E.period.start during "Measurement Period"
//   ["Encounter"] E where E.period.start during "Measurement Period" and E.status = 'cancelled'

  
define "mpop":
  "ipp"
//   ["Encounter"] E where E.period.start during "Measurement Period"
 
define "mpopEx":
  ["Encounter"] E where E.status = 'finished'
  
define "boolIpp":
  true
  
define "boolDenom":
  "boolIpp"

define "boolNum":
  false

define "denom":
  "ipp"

define "num":
  ["Encounter"] E where E.status = 'finished'
  
define function ToCode(coding FHIR.Coding):
    if coding is null then
        null
    else
        System.Code {
          code: coding.code.value,
          system: coding.system.value,
          version: coding.version.value,
          display: coding.display.value
        }

define function fun(i boolean):
  1

define function fun2(e Encounter):
  2

define function fun3(e Encounter):
  3






