import { AbstractMeasureReportBuilder } from '../calculation/AbstractMeasureReportBuilder';
import { CompositeReportBuilder } from '../calculation/CompositeReportBuilder';
import MeasureReportBuilder from '../calculation/MeasureReportBuilder';
import { extractCompositeMeasure, extractMeasureFromBundle } from '../helpers/MeasureBundleHelpers';
import { CalculationOptions, PopulationGroupResult } from '../types/Calculator';

export function getReportBuilder<T extends PopulationGroupResult>(
  measureBundle: fhir4.Bundle,
  options: CalculationOptions
): AbstractMeasureReportBuilder<T> {
  const compositeMeasureResource = extractCompositeMeasure(measureBundle);

  if (compositeMeasureResource) {
    return new CompositeReportBuilder(compositeMeasureResource, options);
  }

  const regularMeasureResource = extractMeasureFromBundle(measureBundle);

  return new MeasureReportBuilder(regularMeasureResource, options);
}
