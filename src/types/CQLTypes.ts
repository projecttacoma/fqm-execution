export interface CQLCode {
  system: string;
  code: string;
  display?: string;
  version?: string;
}

export interface ValueSetMap {
  [key: string]: {
    [key: string]: CQLCode[];
  };
}

export interface Results {
  patientResults: {
    [patientId: string]: StatementResults;
  };
  unfilteredResults: any;
  localIdPatientResultsMap: {
    [patientId: string]: LocalIdResults;
  };
  evaluatedRecords: any[];
}

export interface StatementResults {
  [statementName: string]: any;
}

export interface LocalIdResults {
  [libraryName: string]: {
    [localId: string]: any;
  };
}
