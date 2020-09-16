import { R4 } from '@ahryman40k/ts-fhir-types';
import { ExecutionResult, CalculationOptions } from './types/Calculator';
import { FinalResult, Relevance, PopulationType } from './types/Enums';

// import { PatientSource } from 'cql-exec-fhir';
import cql from 'cql-execution';
import cqlfhir from 'cql-exec-fhir';
import { ELM, ELMValueSet } from './types/ELMTypes';
import { IExecutionValueSet } from './types/ExecutionValueSet';

import { valueSetsForCodeService } from './ValueSetHelper';

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
    const measureEntry = measureBundle.entry?.find(
      e => e.resource?.resourceType === 'Measure'
    ) as R4.IBundle_Entry;
    const measure = measureEntry.resource as R4.IMeasure;
    if (measure?.library === undefined) {
      // TODO: handle no library case
      return [];
    }
    const rootLibRef = measure?.library[0];
    const rootLibId = rootLibRef.substring(rootLibRef.indexOf('/') + 1);
    const rootLibEntry = measureBundle.entry?.find(
      e => e.resource?.resourceType == 'Library' && (e.resource as R4.ILibrary).id === rootLibId
    );
    const rootLib = rootLibEntry?.resource as R4.ILibrary;

    let libraries:R4.ILibrary[];
    let elmJSONs:ELM[];
    let valueSets:ELMValueSet[];
    measureBundle.entry?.forEach((e) => {
      if (e.resource?.resourceType == 'Library') {
        const library = e.resource as R4.ILibrary;
        libraries.push(library);
        const elmsEncoded = library.content?.filter(a => a.contentType === 'application/elm+json');
        elmsEncoded?.forEach((elmEncoded) => {
          if (elmEncoded.data) {
            const decoded = Buffer.from(elmEncoded.data, 'base64').toString('binary');
            const elm = JSON.parse(decoded) as ELM;
            elmJSONs.push(elm);
            if (elm.library?.valueSets) {
              valueSets.push(...elm.library.valueSets.def);
            }
          }
        });
      }
    });

    // for each library decode the the elm json
    const attachments = rootLib.content;
    const elmEncoded = attachments?.filter(a => a.contentType === 'application/elm+json');

    // 2. Prep ValueSets: parse the ValueSets from the bundle, put in form the execution engine takes
    const vsMap: { [id: string]: { [version: string]: IExecutionValueSet[] } } = {};
    elmEncoded?.forEach(e => {
      if (e.data) {
        const decoded = Buffer.from(e.data, 'base64').toString('binary');
        const elm = JSON.parse(decoded) as ELM;
        const valueSets = elm.library?.valueSets;
        valueSets?.def.forEach(evs => {
          const vsExpansion = evs?.expansion?.contains;
          // TODO: Determine version. There is a version specified in 3 different places within ValueSet,
          //       and it's not clear to me which one we should be using.
          // Hard code empty version string for now.
          const version = '';

          if (vsExpansion) {
            vsExpansion?.forEach(code => {
              vsMap[evs.id][version].push({
                code: code.code,
                system: code.system,
                version: version
              });
            });
          }
          // TODO: If no expansion, can we even do anything with it?
        });
      }
    });

    // 3. Parameters: measurement period start and end, which should be included in CalculationOptions
    //    3a. This might be included in the Measure resource.
    //    3b. If no measurement period specified, use a smart default, possible 2020
    let start;
    let end;
    // start = options.measurementPeriodStart?.getUTCMinutes;

    // 4. Create PatientSource: Call cql-exec-fhir passing in patient bundles. Example in the readme.
    const patientSource = cqlfhir.PatientSource.FHIRv401();
    patientSource.loadBundles(patientBundles); // TODO: Is it really this easy, or is there more to it?

    // ExecuteEngine is expecting the valuesets to be formatted like: https://github.com/projecttacoma/cqm-execution/blob/b509d85e25fcbee585eb8695896a18f39bdbb3d9/lib/helpers/calculator_helpers.js#L325 in the place of the vsMap variable used here
    // TODO: this needs to be using the more complicated call that takes more inputs like https://github.com/projecttacoma/cqm-execution/blob/master/lib/models/calculator.js#L209
    cql.Calculator.executeEngine(elmEncoded, patientSource, vsMap);
  }
