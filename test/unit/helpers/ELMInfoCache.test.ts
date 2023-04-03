import { MeasureBundleHelpers } from '../../../src';
import { retrieveELMInfo, clearElmInfoCache } from '../../../src/helpers/elm/ELMInfoCache';
import { getJSONFixture } from './testHelpers';

const measureBundle: fhir4.Bundle = getJSONFixture('bundle/measure-with-library-dependencies.json');
const measure = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure')
  ?.resource as MeasureBundleHelpers.MeasureWithLibrary;
const TEST_ELFB_OUTPUT = { cqls: [], rootLibIdentifier: { id: 'test-id', version: 'test-version' }, elmJSONs: [] };

describe('ELMInfoCache tests', () => {
  beforeEach(() => {
    clearElmInfoCache();
  });
  test('retrieves elm info when useElmJsonsCaching set to false', () => {
    const elfbSpy = jest
      .spyOn(MeasureBundleHelpers, 'extractLibrariesFromMeasureBundle')
      .mockImplementation(() => TEST_ELFB_OUTPUT);
    retrieveELMInfo(measure, measureBundle, [], false);
    expect(elfbSpy).toHaveBeenCalledTimes(1);
  });
  test('does not retrieve elm info on second call when useElmJsonsCaching set to true', () => {
    const elfbSpy = jest
      .spyOn(MeasureBundleHelpers, 'extractLibrariesFromMeasureBundle')
      .mockImplementation(() => TEST_ELFB_OUTPUT);
    retrieveELMInfo(measure, measureBundle, [], true);
    expect(elfbSpy).toHaveBeenCalledTimes(1);
    retrieveELMInfo(measure, measureBundle, [], true);
    expect(elfbSpy).toHaveBeenCalledTimes(1);
  });
  test('retrieves elm info when useElmJsonsCaching set to true and last entry over 10 minutes ago', () => {
    const elfbSpy = jest
      .spyOn(MeasureBundleHelpers, 'extractLibrariesFromMeasureBundle')
      .mockImplementation(() => TEST_ELFB_OUTPUT);
    jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01T00:00:00'));
    retrieveELMInfo(measure, measureBundle, [], true);
    expect(elfbSpy).toHaveBeenCalledTimes(1);
    jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01T00:10:01'));
    retrieveELMInfo(measure, measureBundle, [], true);
    expect(elfbSpy).toHaveBeenCalledTimes(2);
  });
  afterEach(jest.clearAllMocks);
});
