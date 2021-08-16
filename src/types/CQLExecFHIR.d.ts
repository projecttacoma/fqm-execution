declare module 'cql-exec-fhir' {
  export const PatientSource = {
    FHIRv401: class {
      constructor();
      loadBundles(bundles: fhir4.Bundle[]): void;
    }
  };
  export class FHIRWrapper {
    constructor(filePathOrXML: string);
    wrap(fhirJson: R4, fhirResourceType?: string): any;
    static FHIRv401(): FHIRWrapper;
  }
}
