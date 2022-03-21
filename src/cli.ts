#!/usr/bin/env ts-node --files

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import {
  calculate,
  calculateMeasureReports,
  calculateGapsInCare,
  calculateRaw,
  calculateDataRequirements,
  calculateQueryInfo
} from './calculation/Calculator';
import { clearDebugFolder, dumpCQLs, dumpELMJSONs, dumpHTMLs, dumpObject, dumpVSMap } from './helpers/DebugHelpers';
import { CalculationOptions, CalculatorFunctionOutput } from './types/Calculator';
import { AsyncPatientSource, PatientSource } from 'cql-exec-fhir';

program.command('detailed', { isDefault: true }).action(() => {
  program.outputType = 'detailed';
});
program.command('reports').action(() => {
  program.outputType = 'reports';
});
program.command('raw').action(() => {
  program.outputType = 'raw';
});
program.command('gaps').action(() => {
  program.outputType = 'gaps';
});
program.command('dataRequirements').action(() => {
  program.outputType = 'dataRequirements';
});
program.command('queryInfo').action(() => {
  program.outputType = 'queryInfo';
});

program
  .option('--debug', 'enable debug output', false)
  .option('--report-type <report-type>', 'type of report, "individual", "summary", "subject-list"')
  .requiredOption('-m, --measure-bundle <measure-bundle>', 'path to measure bundle')
  .option(
    '-p, --patient-bundles <patient-bundles...>',
    'paths to patient bundles. Required unless output type is dataRequirements. Note: cannot be used with --patient-ids.'
  )
  .option(
    '--patient-ids <ids...>',
    '(with --fhir-server-url) A list of patient ids an AsyncPatientSource will use to query a FHIR server for patient data. Note: cannot be used with --patient-bundles.'
  )
  .option('--as-patient-source', 'Load bundles by creating cql-exec-fhir PatientSource to pass into library calls')
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
    '--vs-api-key <key>',
    'API key, to authenticate against the valueset service to be used for resolving missing valuesets',
    undefined
  )
  .option('--cache-valuesets', 'Whether or not to cache ValueSets retrieved from the ValueSet service', false)
  .option(
    '--fhir-server-url <server-url>',
    '(with --as-patient-source) Loads bundles into an AsyncPatientSource which queries the passed in FHIR server URL for patient data'
  )
  .parse(process.argv);

function parseBundle(filePath: string): fhir4.Bundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as fhir4.Bundle;
}

function getCachedValueSets(cacheDir: string): fhir4.ValueSet[] {
  if (fs.existsSync(cacheDir)) {
    return fs.readdirSync(cacheDir).map(vs => JSON.parse(fs.readFileSync(path.join(cacheDir, vs), 'utf8')));
  }

  return [];
}

async function calc(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  calcOptions: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<CalculatorFunctionOutput> {
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
    result = calculateDataRequirements(measureBundle, calcOptions);
  } else if (program.outputType === 'queryInfo') {
    // calculateQueryInfo doesn't make use of the calcOptions object at this point
    result = calculateQueryInfo(measureBundle);
  }
  if (!result) {
    throw new Error(`Could not obtain result based on outputType ${program.outputType}`);
  }
  return result;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));

let patientBundles: fhir4.Bundle[] = [];
// data requirements/queryInfo doesn't care about patient bundles, so just leave as an empty array if we're using that report type
if (program.outputType !== 'dataRequirements' && program.outputType !== 'queryInfo') {
  // Since patient bundles are no longer a mandatory CLI option, we should check if we were given any before
  if (!program.patientBundles && !program.patientIds) {
    console.error(`Must provide either patient bundle or patient ids when output type is "${program.outputType}"`);
    program.help();
  }
  if (program.patientBundles) {
    if (program.patientIds) {
      console.error('Cannot use both --patient-bundles and --patient-ids flags');
      program.help();
    }
    patientBundles = program.patientBundles.map((bundlePath: string) => parseBundle(path.resolve(bundlePath)));
  }
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

// if we want to pass patient data into the fqm-execution API as a cql-exec-fhir patient source. Build patientSource
// from patientBundles and wipe patientBundles to be an empty array.
if (program.asPatientSource) {
  let patientSource;
  if (program.fhirServerUrl) {
    if (!program.patientIds) {
      console.error(
        'Must provide an array of patient ids with --patient-ids flag for calculation using AsyncPatientSource'
      );
    }
    patientSource = AsyncPatientSource.FHIRv401(program.fhirServerUrl);
    patientSource.loadPatientIds(program.patientIds);
  } else {
    patientSource = PatientSource.FHIRv401();
    patientSource.loadBundles(patientBundles);
  }
  calcOptions.patientSource = patientSource;
  patientBundles = [];
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

      // Dump raw, detailed, reports, gaps in care objects
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
      (result.valueSetCache as fhir4.ValueSet[]).forEach(vs => {
        fs.writeFileSync(`./cache/terminology/${vs.id}.json`, JSON.stringify(vs), 'utf8');
      });
    }

    console.log(JSON.stringify(result?.results, null, 2));
  })
  .catch(error => {
    console.error(error.message);
    console.error(error.stack);
  });
if (program.outputType !== 'reports' && program.reportType) {
  console.error('Report type was specified when not asking for reports.');
  program.help();
}
