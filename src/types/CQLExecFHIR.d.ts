declare module 'cql-exec-fhir' {
  import { R4 } from '@ahryman40k/ts-fhir-types';
  export const PatientSource = {
    FHIRv401: class {
      constructor();
      loadBundles(bundles: R4.IBundle[]): void;
    }
  };
}
