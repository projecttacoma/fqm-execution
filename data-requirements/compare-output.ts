import fs from 'fs';
import * as _ from 'lodash';

/**
 * The purpose of this script is to comparison the output of the current fqm-execution (1.3.3) data-requirements JSON output
 * to the current data-requirements JSON output of the elm-parser-for-ecqms fhir_review branch
 */

// Get the JSON data-requirements output for a single measure from fqm-execution (put JSON file into fqm-e-input directory)
const fqmEDataRequirementsLibrary = JSON.parse(
  fs.readFileSync('./fqm-e-input/ColorectalCancerScreeningsDR.json', 'utf8')
) as fhir4.Library;
const fqmEDataRequirements = fqmEDataRequirementsLibrary?.dataRequirement as fhir4.DataRequirement[];

// Get the JSON data-requirements output for a single measure from elm-parser-for-ecqms (put JSON file into elm-parser-input directory)
const elmParserDataRequirementsLibrary = JSON.parse(
  fs.readFileSync('./elm-parser-input/library/ColorectalCancerScreeningsFHIR.xml.json', 'utf8')
) as fhir4.Library;
const elmPaserDataRequirements = elmParserDataRequirementsLibrary?.dataRequirement as fhir4.DataRequirement[];

// Group data requirements in each file by type in Record<string, DataRequirement[]>
let fqmEData: Record<string, fhir4.DataRequirement[]> = {};
fqmEDataRequirements.forEach(dr => {
  if (fqmEData[dr.type]) {
    fqmEData[dr.type].push(dr);
  } else {
    fqmEData[dr.type] = [dr];
  }
});

// Sort the data requirements by type alphabetically
let sortedFqmEData: Record<string, fhir4.DataRequirement[]> = {};

Object.keys(fqmEData)
  .sort()
  .forEach(key => {
    sortedFqmEData[key] = fqmEData[key];
  });

// Print the fqm-execution results to the console
console.log('------FQM-EXECUTION------');

_.forEach(sortedFqmEData, function (value, key) {
  console.log(key, value.length);
});

// Group data requirements in each file by type in Record<string, DataRequirement[]>
let elmParserData: Record<string, fhir4.DataRequirement[]> = {};
elmPaserDataRequirements.forEach(dr => {
  if (elmParserData[dr.type]) {
    elmParserData[dr.type].push(dr);
  } else {
    elmParserData[dr.type] = [dr];
  }
});

// Sort the data requirements by type alphabetically
let sortedElmParserData: Record<string, fhir4.DataRequirement[]> = {};

Object.keys(elmParserData)
  .sort()
  .forEach(key => {
    sortedElmParserData[key] = elmParserData[key];
  });

// Print the fqm-execution results to the console
console.log('------ELM-PARSER------');

_.forEach(sortedElmParserData, function (value, key) {
  console.log(key, value.length);
});
