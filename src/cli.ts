#!/usr/bin/env ts-node --files

import { R4 } from '@ahryman40k/ts-fhir-types';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import {
  calculate,
  calculateMeasureReports,
  calculateGapsInCare,
  calculateRaw,
  calculateDataRequirements
} from './Calculator';
import { clearDebugFolder, dumpCQLs, dumpELMJSONs, dumpHTMLs, dumpObject, dumpVSMap } from './DebugHelper';
import { CalculationOptions, CalculatorFunctionOutput } from './types/Calculator';

program
  .option('-d, --debug', 'enable debug output', false)
  .option(
    '-o, --output-type <type>',
    'type of output, "raw", "detailed", "reports", "gaps", "dataRequirements"',
    'detailed'
  )
  .option('-r, --report-type <report-type>', 'type of report, "individual", "summary", "subject-list"')
  .requiredOption('-m, --measure-bundle <measure-bundle>', 'path to measure bundle')
  .option(
    '-p, --patient-bundles <patient-bundles...>',
    'paths to patient bundles. Required unless output type is dataRequirements'
  )
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
  .option('-c, --cache-valuesets', 'Whether or not to cache ValueSets retrieved from the ValueSet service', false)
  .parse(process.argv);

function parseBundle(filePath: string): R4.IBundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as R4.IBundle;
}

function getCachedValueSets(cacheDir: string): R4.IValueSet[] {
  if (fs.existsSync(cacheDir)) {
    return fs.readdirSync(cacheDir).map(vs => JSON.parse(fs.readFileSync(path.join(cacheDir, vs), 'utf8')));
  }

  return [];
}

async function calc(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  calcOptions: CalculationOptions
): Promise<CalculatorFunctionOutput | undefined> {

  let result;
  if (program.outputType === 'raw') {
    result = await calculateRaw(measureBundle, patientBundles, calcOptions, valueSetCache);
  } else if (program.outputType === 'detailed') {
    result = await calculate(measureBundle, patientBundles, calcOptions, valueSetCache);
  } else if (program.outputType === 'reports') {
    calcOptions.reportType = program.reportType || 'individual';
    result = await calculateMeasureReports(measureBundle, patientBundles, calcOptions, valueSetCache);
  } else if (program.outputType === 'gaps') {
    result = await calculateGapsInCare(measureBundle, patientBundles, calcOptions, valueSetCache);
  } else if (program.outputType === 'dataRequirements') {
    // CalculateDataRequirements doesn't make use of the calcOptions object at this point
    result = calculateDataRequirements(measureBundle);
  }
  return result;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));

let patientBundles: R4.IBundle[];
if (program.outputType !== 'dataRequirements') {
  // Since patient bundles are no longer a mandatory CLI option, we should check if we were given any before
  if (!program.patientBundles) {
    console.error(`Patient bundle is a required option when output type is "${program.outputType}"`);
    program.help();
  }
  patientBundles = program.patientBundles.map((bundlePath: string) => parseBundle(path.resolve(bundlePath)));
} else {
  // data requirements doesn't care about patient bundles, so just pass an empty array if we're using that report type
  patientBundles = [];
}

// Only cache valuesets retreived from service
if (program.cacheValuesets && !program.vsApiKey) {
  console.error('ValueSet caching only supported when an API key is provided');
  program.help();
}

const cacheDirectory = 'cache/terminology';

const calcOptions: CalculationOptions = {
  enableDebugOutput: program.debug,
  vsAPIKey: program.vsApiKey,
  useValueSetCaching: program.cacheValuesets
};

// Override the measurement period start/end in the options only if the user specified them
if (program.measurementPeriodStart) {
  calcOptions.measurementPeriodStart = program.measurementPeriodStart;
}
if (program.measurementPeriodEnd) {
  calcOptions.measurementPeriodEnd = program.measurementPeriodEnd;
}

// Calculation is now async, so we have to do a callback here
calc(
  measureBundle,
  patientBundles,
  calcOptions,
  calcOptions.useValueSetCaching ? getCachedValueSets(cacheDirectory) : []
)
  .then(result => {
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

    // Update cache
    if (program.cacheValuesets && result.valueSetCache) {
      if (!fs.existsSync('./cache/terminology')) {
        fs.mkdirSync('./cache/terminology/', { recursive: true });
      }
      (result.valueSetCache as R4.IValueSet[]).forEach(vs => {
        fs.writeFileSync(`./cache/terminology/${vs.id}.json`, JSON.stringify(vs), 'utf8');
      });
    }

    console.log(JSON.stringify(result?.results, null, 2));
  })
  .catch(error => {
    console.error(error.message);
  });
if (program.outputType !== 'reports' && program.reportType) {
  console.error('Report type was specified when not asking for reports.');
  program.help();
}
