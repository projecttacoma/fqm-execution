import { CalculationOptions, ExecutionResult, PopulationGroupResult } from '../types/Calculator';

export abstract class AbstractMeasureReportBuilder<
  T extends PopulationGroupResult,
  R extends fhir4.MeasureReport = fhir4.MeasureReport
> {
  abstract report: R;

  constructor(public measure: fhir4.Measure, public options: CalculationOptions) {}

  abstract addPatientResults(result: ExecutionResult<T>): void;
  abstract getReport(): R;

  addEvaluatedResources(result: ExecutionResult<T>) {
    if (result.evaluatedResource) {
      result.evaluatedResource.forEach(resource => {
        const reference: fhir4.Reference = {
          reference: `${resource.resourceType}/${resource.id}`
        };
        if (!this.report.evaluatedResource?.some(r => r.reference === reference.reference)) {
          if (!this.report.evaluatedResource) {
            this.report.evaluatedResource = [reference];
          } else {
            this.report.evaluatedResource.push(reference);
          }
        }
      });
    }
  }
}
