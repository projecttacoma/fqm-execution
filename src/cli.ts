#!/usr/bin/env node

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
import { addValueSetsToMeasureBundle } from './helpers/MeasureBundleHelpers';
import { clearDebugFolder, dumpCQLs, dumpELMJSONs, dumpHTMLs, dumpObject, dumpVSMap } from './helpers/DebugHelpers';
import { CalculationOptions, CalculatorFunctionOutput } from './types/Calculator';
import { PatientSource } from 'cql-exec-fhir';

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
program.command('valueSets').action(() => {
  program.outputType = 'valueSets';
});

program
  .option('--debug', 'Enable debug output.', false)
  .option('--slim', 'Use slimmed-down calculation results interfaces', false)
  .option('--report-type <report-type>', 'Type of report, "individual", "summary", "subject-list".')
  .requiredOption('-m, --measure-bundle <measure-bundle>', 'Path to measure bundle.')
  .option(
    '-p, --patient-bundles <patient-bundles...>',
    'Paths to patient bundles. Required unless output type is dataRequirements.'
  )
  .option('--as-patient-source', 'Load bundles by creating cql-exec-fhir PatientSource to pass into library calls.')
  .option(
    '-s, --measurement-period-start <date>',
    'Start date for the measurement period, in YYYY-MM-DD format (defaults to the start date defined in the Measure, or 2019-01-01 if not set there).',
    undefined
  )
  .option(
    '-e, --measurement-period-end <date>',
    'End date for the measurement period, in YYYY-MM-DD format (defaults to the end date defined in the Measure, or 2019-12-31 if not set there).',
    undefined
  )
  .option(
    '--vs-api-key <key>',
    'API key, to authenticate against the valueset service to be used for resolving missing valuesets.',
    undefined
  )
  .option('--cache-valuesets', 'Whether or not to cache ValueSets retrieved from the ValueSet service.', false)
  .option(
    '--profile-validation',
    'To "trust" the content of meta.profile as a source of truth for what profiles the data that cql-exec-fhir grabs validates against.',
    false
  )
  .option(
    '-o, --out-file [file-path]',
    'Path to a file that fqm-execution will write the calculation results to (default: output.json)'
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

function writeToFile(filePath: string, results: string) {
  fs.writeFile(filePath, results, err => {
    if (err) throw err;
  });
  console.log(`Calculation results written to file path: ${filePath}`);
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
    result = calculateQueryInfo(measureBundle, calcOptions);
  } else if (program.outputType === 'valueSets') {
    result = await addValueSetsToMeasureBundle(measureBundle, calcOptions);
  }
  if (!result) {
    throw new Error(`Could not obtain result based on outputType ${program.outputType}`);
  }
  return result;
}

async function populatePatientBundles() {
  let patientBundles: fhir4.Bundle[] = [];
  // data requirements/queryInfo/valueSets doesn't care about patient bundles, so just leave as an empty array if we're using that report type
  if (!['dataRequirements', 'queryInfo', 'valueSets'].includes(program.outputType)) {
    // Since patient bundles are no longer a mandatory CLI option, we should check if we were given any before
    if (!program.patientBundles) {
      console.error(`Must patient bundles when output type is "${program.outputType}"`);
      program.help();
    }

    patientBundles = program.patientBundles.map((bundlePath: string) => parseBundle(path.resolve(bundlePath)));

    // if we want to pass patient data into the fqm-execution API as a cql-exec-fhir patient source. Build patientSource
    // from patientBundles and wipe patientBundles to be an empty array.
    if (program.asPatientSource) {
      const patientSource = PatientSource.FHIRv401(program.profileValidation);
      patientSource.loadBundles(patientBundles);
      calcOptions.patientSource = patientSource;
      patientBundles = [];
    }
  }
  return patientBundles;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));

// Only cache valuesets retreived from service
if (program.cacheValuesets && !program.vsApiKey) {
  console.error('ValueSet caching only supported when an API key is provided');
  program.help();
}

const cacheDirectory = 'cache/terminology';

const calcOptions: CalculationOptions = {
  enableDebugOutput: program.debug,
  vsAPIKey: program.vsApiKey,
  useValueSetCaching: program.cacheValuesets,
  verboseCalculationResults: !program.slim,
  trustMetaProfile: program.profileValidation
};

// Override the measurement period start/end in the options only if the user specified them
if (program.measurementPeriodStart) {
  calcOptions.measurementPeriodStart = program.measurementPeriodStart;
}
if (program.measurementPeriodEnd) {
  calcOptions.measurementPeriodEnd = program.measurementPeriodEnd;
}

populatePatientBundles().then(async patientBundles => {
  try {
    const result = await calc(
      measureBundle,
      patientBundles,
      calcOptions,
      calcOptions.useValueSetCaching ? getCachedValueSets(cacheDirectory) : []
    );

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

    // --out-file flag specified but no file path provided
    if (program.outFile === true || (!program.outFile && program.outputType === 'valueSets')) {
      // use output.json (default file path) since no file path was provided
      writeToFile('output.json', JSON.stringify(result?.results, null, 2));
      // --out-file flag specified with a file path
    } else if (program.outFile) {
      writeToFile(program.outFile, JSON.stringify(result?.results, null, 2));
      // log results to stdout instead of file path (--out-file flag not specified)
    } else {
      console.log(JSON.stringify(result?.results, null, 2));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
  }
});

if (program.outputType !== 'reports' && program.reportType) {
  console.error('Report type was specified when not asking for reports.');
  program.help();
}
