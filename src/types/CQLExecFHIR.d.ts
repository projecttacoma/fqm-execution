declare module 'cql-exec-fhir' {
  import { R4 } from '@ahryman40k/ts-fhir-types';
  export const PatientSource = {
    FHIRv401: class {
      constructor();
      loadBundles(bundles: R4.IBundle[]): void;
    }
  };
  export class FHIRWrapper {
    constructor(filePathOrXML: string);
    wrap(fhirJson: R4, fhirResourceType?: string): any;
    static FHIRv401(): FHIRWrapper;
  }
}
