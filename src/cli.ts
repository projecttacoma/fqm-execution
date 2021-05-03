#!/usr/bin/env ts-node --files

import { R4 } from '@ahryman40k/ts-fhir-types';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { calculate, calculateGapsInCare, calculateMeasureReports, calculateRaw } from './Calculator';
import { clearDebugFolder, dumpCQLs, dumpELMJSONs, dumpHTMLs, dumpObject, dumpVSMap } from './DebugHelper';
import { CalculationOptions } from './types/Calculator';

program
  .option('-d, --debug', 'enable debug output', false)
  .option('-o, --output-type <type>', 'type of output, "raw", "detailed", "reports", "gaps"', 'detailed')
  .requiredOption('-m, --measure-bundle <measure-bundle>', 'path to measure bundle')
  .requiredOption('-p, --patient-bundles <patient-bundles...>', 'paths to patient bundle')
  .option(
    '-s, --measurement-period-start <date>',
    'start date for the measurement period, in YYYY-MM-DD format (defaults to the start date defined in the Measure, or 2019-01-01 if not set there)',
    undefined
  )
  .option(
    '-e, --measurement-period-end <date>',
    'end date for the measurement period, in YYYY-MM-DD format (defaults to the end date defined in the Measure, or 2019-12-31 if not set there)',
    undefined
  )
  .option(
    '-a, --vs-api-key <key>',
    'API key, to authenticate against the valueset service to be used for resolving missing valuesets',
    undefined
  )
  .parse(process.argv);

function parseBundle(filePath: string): R4.IBundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as R4.IBundle;
}

async function calc(measureBundle:R4.IBundle, patientBundles:R4.IBundle[], calcOptions:CalculationOptions): Promise<any> {
  let result;
  if (program.outputType === 'raw') {
    result = await calculateRaw(measureBundle, patientBundles, calcOptions);
  } else if (program.outputType === 'detailed') {
    result = await calculate(measureBundle, patientBundles, calcOptions);
  } else if (program.outputType === 'reports') {
    result = await calculateMeasureReports(measureBundle, patientBundles, calcOptions);
  } else if (program.outputType === 'gaps') {
    result = await calculateGapsInCare(measureBundle, patientBundles, calcOptions);
  }
  return result;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));

const patientBundles = program.patientBundles.map((bundlePath: string) => parseBundle(path.resolve(bundlePath)));

const calcOptions: CalculationOptions = { 
  enableDebugOutput: program.debug,
  vsAPIKey: program.vsApiKey
};

// Override the measurement period start/end in the options only if the user specfied them
if (program.measurementPeriodStart) {
  calcOptions.measurementPeriodStart = program.measurementPeriodStart;
}
if (program.measurementPeriodEnd) {
  calcOptions.measurementPeriodEnd = program.measurementPeriodEnd;
}

// Calculation is now async, so we have to do a callback here
calc(measureBundle, patientBundles, calcOptions).then((result) => {
  if (program.debug) {
    clearDebugFolder();
  
    const debugOutput = result?.debugOutput;
  
    // Dump raw, detailed, reports, gapt in care objects
    if (debugOutput?.rawResults) {
      dumpObject(debugOutput.rawResults, 'rawResults.json');
    }
  
    if (debugOutput?.detailedResults) {
      dumpObject(debugOutput.detailedResults, 'detailedResults.json');
    }
  
    if (debugOutput?.measureReports) {
      dumpObject(debugOutput.measureReports, 'measureReports.json');
    }
  
    if (debugOutput?.gaps) {
      dumpObject(debugOutput.gaps, 'gaps.json');
    }
  
    // Dump ELM
    if (debugOutput?.elm) {
      dumpELMJSONs(debugOutput.elm);
    }
  
    // Dump CQL
    if (debugOutput?.cql) {
      dumpCQLs(debugOutput.cql);
    }
  
    // Dump VS Map
    if (debugOutput?.vs) {
      dumpVSMap(debugOutput.vs);
    }
  
    // Dump HTML
    if (debugOutput?.html) {
      dumpHTMLs(debugOutput.html);
    }
  }
  
  console.log(JSON.stringify(result?.results, null, 2));
});
