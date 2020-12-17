#!/usr/bin/env ts-node --files

import { R4 } from '@ahryman40k/ts-fhir-types';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { calculate, calculateGapsInCare, calculateMeasureReports, calculateRaw } from './Calculator';
import { clearDebugFolder, dumpCQLs, dumpELMJSONs, dumpHTMLs, dumpObject, dumpVSMap } from './DebugHelper';

program
  .option('-d, --debug', 'enable debug output', false)
  .option('-o, --output-type <type>', 'type of output, "raw", "detailed", "reports", "gaps"', 'detailed')
  .requiredOption('-m, --measure-bundle <measure-bundle>', 'path to measure bundle')
  .requiredOption('-p, --patient-bundles <patient-bundles...>', 'paths to patient bundle')
  .parse(process.argv);

function parseBundle(filePath: string): R4.IBundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as R4.IBundle;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));

const patientBundles = program.patientBundles.map((bundlePath: string) => parseBundle(path.resolve(bundlePath)));

let result;
if (program.outputType === 'raw') {
  result = calculateRaw(measureBundle, patientBundles, { enableDebugOutput: program.debug });
} else if (program.outputType === 'detailed') {
  result = calculate(measureBundle, patientBundles, { calculateSDEs: true, enableDebugOutput: program.debug });
} else if (program.outputType === 'reports') {
  result = calculateMeasureReports(measureBundle, patientBundles, {
    measurementPeriodStart: '2019-01-01',
    measurementPeriodEnd: '2019-12-31',
    calculateSDEs: true,
    calculateHTML: true,
    enableDebugOutput: program.debug
  });
} else if (program.outputType === 'gaps') {
  result = calculateGapsInCare(measureBundle, patientBundles, { enableDebugOutput: program.debug });
}

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
