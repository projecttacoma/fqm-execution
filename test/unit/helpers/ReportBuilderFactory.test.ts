import MeasureReportBuilder from '../../../src/calculation/MeasureReportBuilder';
import { CompositeReportBuilder } from '../../../src/calculation/CompositeReportBuilder';
import { getReportBuilder } from '../../../src/helpers/ReportBuilderFactory';
import { getJSONFixture } from './testHelpers';

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as fhir4.Measure;
const simpleCompositeMeasure = getJSONFixture('measure/simple-composite-measure.json') as fhir4.Measure;

const simpleMeasureBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: simpleMeasure
    }
  ]
};

const simpleCompositeMeasureBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: simpleCompositeMeasure
    },
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
    expect(getReportBuilder(simpleCompositeMeasureBundle, {})).toBeInstanceOf(CompositeReportBuilder);
  });
});
