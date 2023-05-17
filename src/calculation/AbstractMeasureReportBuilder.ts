import { CalculationOptions, ExecutionResult, PopulationGroupResult } from '../types/Calculator';

export abstract class AbstractMeasureReportBuilder<T extends PopulationGroupResult, R = fhir4.MeasureReport> {
  abstract report: R;

  constructor(public measure: fhir4.Measure, public options: CalculationOptions) {}

  abstract addPatientResults(result: ExecutionResult<T>): void;
  abstract getReport(): R;
}
