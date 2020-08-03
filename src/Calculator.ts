import { R4 } from '@ahryman40k/ts-fhir-types';
import { ExecutionResult, CalculationOptions } from './types/Calculator';
import { FinalResult, Relevance, PopulationType } from './types/Enums';

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
  // 1. Prep libraries: parse from measure bundle, pull out ELM
  //    1a. Determine "root" library. Can do this by looking at which lib is referenced by populations

  // 2. Prep ValueSets: parse the ValueSets from the bundle, put in form the execution engine takes
  //    2a. Hoss's other project has this code which we could reuse

  // 3. Parameters: measurement period start and end, which should be included in CalculationOptions
  //    3a. This might be included in the Measure resource.
  //    3b. If no measurement period specified, use a smart default, possible 2020
  let start;
  let end;
  start = options.measurementPeriodStart?.getUTCMinutes;
  // 4. Create PatientSource: Call cql-exec-fhir passing in patient bundles. Example in the readme.
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
): void {}
