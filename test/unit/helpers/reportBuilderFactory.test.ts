import MeasureReportBuilder from '../../../src/calculation/MeasureReportBuilder';
import { CompositeReportBuilder } from '../../../src/calculation/CompositeReportBuilder';
import { getReportBuilder } from '../../../src/helpers/reportBuilderFactory';
import { getJSONFixture } from './testHelpers';

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as fhir4.Measure;

const simpleMeasureBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: simpleMeasure
    }
  ]
};

describe('getReportBuilder', () => {
  it('returns instance of MeasureReportBuilder when no composite measure is present', () => {
    expect(getReportBuilder(simpleMeasureBundle, {})).toBeInstanceOf(MeasureReportBuilder);
  });

  it('returns instance of CompositeReportBuilder when composite measure is present', () => {
    throw new Error('TODO');
    // expect(getReportBuilder(compositeMeasureBundle, {})).toBeInstanceOf(CompositeReportBuilder);
  });
});
