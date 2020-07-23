import { R4 } from '@ahryman40k/ts-fhir-types';
import { ExecutionResult, CalculationOptions } from './types/Calculator';

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
      }
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
