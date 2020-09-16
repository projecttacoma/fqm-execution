import { R4 } from '@ahryman40k/ts-fhir-types';
import { Calculator } from './src/index';

const measureBundle = import('./test/fixtures/EXM130-8.0.000/EXM130-8.0.000-bundle.json');
const patientBundle = import(
  './test/fixtures/EXM130-8.0.000/EXM130-8.0.000-patients/numerator/Adeline686_Prohaska837_ee009b12-7dbe-4610-abc4-5f92ad5b2804.json'
);

Promise.all([measureBundle, patientBundle]).then((values) => {
  Calculator.calculateRaw(values[0] as R4.IBundle, [values[1] as R4.IBundle], {});
});

