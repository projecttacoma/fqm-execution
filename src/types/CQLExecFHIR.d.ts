declare module 'cql-exec-fhir' {
  import { RecordObject, PatientObject, DataProvider, RetrieveDetails } from 'cql-execution';

  interface PatientSourceOptions {
    requireProfileTagging: boolean;
  }

  class FHIRObject implements RecordObject {
    get(field: string): any;
  }

  class Patient extends FHIRObject implements PatientObject {
    findRecords(profile: string, retrieveDetails?: RetrieveDetails): FHIRObject;
    findRecord(profile: string, retrieveDetails?: RetrieveDetails): FHIRObject;
  }

  export class PatientSource implements DataProvider {
    constructor(filePathOrXML: string, patientSourceOptions?: PatientSourceOptions);
    loadBundles(bundles: fhir4.Bundle[]): void;
    currentPatient(): Patient | undefined;
    nextPatient(): Patient | undefined;
    reset(): void;
    static FHIRv401(patientSourceOptions?: PatientSourceOptions): PatientSource;
  }

  export class FHIRWrapper {
    constructor(filePathOrXML: string);
    wrap(fhirJson: fhir4.FhirResource, fhirResourceType?: string): any;
    static FHIRv401(): FHIRWrapper;
  }
}
