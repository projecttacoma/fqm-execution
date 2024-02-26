import { DataRequirement } from 'fhir/r4';
import fs from 'fs';
import * as _ from 'lodash';

type DataRequirementType = {
  'Data Type': string;
  'Template Id': string;
  'Data Type Value Set'?: string;
  'Data Type Value OID': string;
  Attribute: string;
};

let sortedFqmEData: Record<string, DataRequirement[]> = {};

// Get Data Requirements from fqm-execution output
const fqmEDRLib = JSON.parse(
  fs.readFileSync('./fqm-e-input/ColorectalCancerScreeningsDR.json', 'utf8')
) as fhir4.Library;

// Group data requirements by type in Record<string, DataRequirement[]>
let fqmEData: Record<string, DataRequirement[]> = {};
fqmEDRLib.dataRequirement?.forEach(dr => {
  if (fqmEData[dr.type]) {
    fqmEData[dr.type].push(dr);
  } else {
    fqmEData[dr.type] = [dr];
  }
});

// Sort the data requirements by type alphabetically
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

// Get Data Requirements from the elm-parser output of fhir_all.csv
const elmParserDR = JSON.parse(
  fs.readFileSync('./elm-parser-json/all/ColorectalCancerScreeningsFHIR.json', 'utf8')
) as DataRequirementType[];

// Group data requirements by type in Record<string, DataRequirementType[]>
let elmParserData: Record<string, DataRequirementType[]> = {};
elmParserDR.forEach(dr => {
  if (elmParserData[dr['Data Type']]) {
    elmParserData[dr['Data Type']].push(dr);
  } else {
    elmParserData[dr['Data Type']] = [dr];
  }
});

// Sort the data requirements by type alphabetically
let sortedData: Record<string, DataRequirementType[]> = {};
Object.keys(elmParserData)
  .sort()
  .forEach(key => {
    sortedData[key] = elmParserData[key];
  });

// Print the elm-parser results to the console
console.log('------ELM-PARSER-FHIR-ALL------');

_.forEach(sortedData, function (value, key) {
  console.log(key, value.length);
});

// Get Data Requirements from th elm-parser by_measure output
const elmParserByMeasureDR = JSON.parse(
  fs.readFileSync('./elm-parser-json/by_measure/ColorectalCancerScreeningsFHIR.json', 'utf8')
) as DataRequirementType[];

// Group data requirements by type in Record<string, DataRequirementType[]>
let elmParserByMeasureData: Record<string, DataRequirementType[]> = {};
elmParserByMeasureDR.forEach(dr => {
  if (elmParserByMeasureData[dr['Data Type']]) {
    elmParserByMeasureData[dr['Data Type']].push(dr);
  } else {
    elmParserByMeasureData[dr['Data Type']] = [dr];
  }
});

// Sort the data requirements by type alphabetically
let sortedByMeasureData: Record<string, DataRequirementType[]> = {};
Object.keys(elmParserByMeasureData)
  .sort()
  .forEach(key => {
    sortedByMeasureData[key] = elmParserByMeasureData[key];
  });

// Print the elm-parser results to the console
console.log('------ELM-PARSER-BY-MEASURE------');

_.forEach(sortedByMeasureData, function (value, key) {
  console.log(key, value.length);
});
