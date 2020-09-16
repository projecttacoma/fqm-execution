import { R4 } from '@ahryman40k/ts-fhir-types';
import { ExecutionResult, CalculationOptions } from './types/Calculator';
import { FinalResult, Relevance, PopulationType } from './types/Enums';

// import { PatientSource } from 'cql-exec-fhir';
import cql from 'cql-execution';
import { PatientSource } from 'cql-exec-fhir';
import { ELM, ELMIdentifier } from './types/ELMTypes';

import { valueSetsForCodeService, parseTimeStringAsUTC } from './ValueSetHelper';

/**
 * Calculate measure against a set of patients. Returning detailed results for each patient and population group.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @returns Detailed execution results. One for each patient.
 */
export function calculate(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): ExecutionResult[] {
  return [
    {
      patientId: '1',
      measureReport: {
        resourceType: 'MeasureReport',
        measure: 'Measure/ImplementMe',
        period: {}
      },
      detailedResults: [
        {
          groupId: '0',
          statementResults: [
            {
              libraryName: 'BaseLibrary',
              statementName: 'Initial Population',
              localId: '102',
              final: FinalResult.TRUE,
              raw: true,
              relevance: Relevance.TRUE,
              pretty: 'TRUE'
            }
          ],
          clauseResults: [
            {
              libraryName: 'BaseLibrary',
              statementName: 'Initial Population',
              localId: '102',
              final: FinalResult.TRUE,
              raw: true
            }
          ],
          populationResults: [
            {
              populationType: PopulationType.IPP,
              result: true
            },
            {
              populationType: PopulationType.DENOM,
              result: false
            }
          ]
        }
      ]
    }
  ];
}

/**
 * Calculate measure against a set of patients. Returning detailed results for each patient and population group.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @returns MeasureReport resource for each patient.
 */
export function calculateMeasureReports(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): R4.IMeasureReport[] {
  return [
    {
      resourceType: 'MeasureReport',
      measure: 'Measure/ImplementMe',
      period: {}
    }
  ];
}

export function calculateRaw(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): any {
  // TODO: return type^

  // Determine "root" library by looking at which lib is referenced by populations, and pull out the ELM
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure') as R4.IBundle_Entry;
  const measure = measureEntry.resource as R4.IMeasure;
  if (measure?.library === undefined) {
    // TODO: handle no library case
    return [];
  }
  const rootLibRef = measure?.library[0];
  const rootLibId = rootLibRef.substring(rootLibRef.indexOf('/') + 1);

  const libraries: R4.ILibrary[] = [];
  const elmJSONs: ELM[] = [];
  let rootLibIdentifer: ELMIdentifier = {
    id: '',
    version: ''
  };
  measureBundle.entry?.forEach(e => {
    if (e.resource?.resourceType == 'Library') {
      const library = e.resource as R4.ILibrary;
      libraries.push(library);
      const elmsEncoded = library.content?.filter(a => a.contentType === 'application/elm+json');
      elmsEncoded?.forEach(elmEncoded => {
        if (elmEncoded.data) {
          const decoded = Buffer.from(elmEncoded.data, 'base64').toString('binary');
          const elm = JSON.parse(decoded) as ELM;
          if (library.id === rootLibId) {
            rootLibIdentifer = elm.library.identifier;
          }
          // This line is a hack to 
          if (elm.library?.includes?.def) {
            elm.library.includes.def = elm.library.includes.def.map(def => {
              def.path = def.path.substring(def.path.lastIndexOf('/') + 1);
              return def;
            });
          }
          elmJSONs.push(elm);
        }
      });
    }
  });
  
  // TODO: throw an error here if we can't find the root lib
  if (rootLibIdentifer.id === '') {
    return 'no library';
  }

  const valueSets: R4.IValueSet[] = [];
  measureBundle.entry?.forEach(e => {
    if (e.resource?.resourceType === 'ValueSet') {
      valueSets.push(e.resource as R4.IValueSet);
    }
  });
  const vsMap = valueSetsForCodeService(valueSets);

  // Measure datetime stuff
  let start;
  let end;
  if (options.measurementPeriodStart) {
    start = parseTimeStringAsUTC(options.measurementPeriodStart);
  } else {
    start = new Date('2019-01-01');
  }
  if (options.measurementPeriodEnd) {
    end = parseTimeStringAsUTC(options.measurementPeriodEnd);
  } else {
    end = new Date('2019-12-31');
  }
  const startCql = cql.DateTime.fromJSDate(start, 0); // No timezone offset for start
  const endCql = cql.DateTime.fromJSDate(end, 0); // No timezone offset for stop

  const patientSource = new PatientSource.FHIRv401();
  patientSource.loadBundles(patientBundles);

  const codeService = new cql.CodeService(vsMap);
  const parameters = { 'Measurement Period': new cql.Interval(startCql, endCql) };
  const executionDateTime = cql.DateTime.fromJSDate(new Date(), 0);
  const rep = new cql.Repository(elmJSONs);
  const lib = rep.resolve(rootLibIdentifer.id, rootLibIdentifer.version);

  // console.log(elmJSONs.map(json => json.library.identifier));

  // console.log(elmJSONs[0].library.includes);

  const executor = new cql.Executor(lib, codeService, parameters);
  const results = executor.exec(patientSource, executionDateTime);
  return results;
}
