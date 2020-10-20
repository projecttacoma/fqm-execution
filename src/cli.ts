#!/usr/bin/env ts-node --files

import { R4 } from '@ahryman40k/ts-fhir-types';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { calculate, calculateMeasureReports, calculateRaw } from './Calculator';

program
  .option('-o, --output-type <type>', 'type of output, "raw", "detailed", "reports"', 'detailed')
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
if (program.outputType == 'raw') {
  result = calculateRaw(measureBundle, patientBundles, {});
} else if (program.outputType == 'detailed') {
  result = calculate(measureBundle, patientBundles, { calculateSDEs: true });
} else if (program.outputType == 'reports') {
  result = calculateMeasureReports(measureBundle, patientBundles, {
    measurementPeriodStart: '2019-01-01',
    measurementPeriodEnd: '2019-12-31',
    calculateSDEs: true,
    calculateHTML: true
  });
}
console.log(JSON.stringify(result, null, 2));
