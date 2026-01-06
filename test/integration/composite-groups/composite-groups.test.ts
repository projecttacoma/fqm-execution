import { getJSONFixture } from '../helpers/testHelpers';

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture('composite-groups/composite-groups-bundle.json');

const COMPONENT_ONE_CANONICAL = 'http://example.com/Measure/measure-AllOrNothingComponentOne|0.0.1';
const COMPONENT_TWO_CANONICAL = 'http://example.com/Measure/measure-AllOrNothingComponentTwo|0.0.1';
const COMPONENT_THREE_CANONICAL = 'http://example.com/Measure/measure-AllOrNothingComponentThree|0.0.1';
