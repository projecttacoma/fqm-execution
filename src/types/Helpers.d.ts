export interface ELM {
  library: ELMLibrary;
}

export interface ELMLibrary {
  identifier: ELMIdentifier;
  schemaIdentifier: ELMIdentifier;
  usings: any;
  includes?: any;
  parameters?: any;
  codeSystems?: any;
  valueSets?: any;
  codes?: any;
  statements: any;
}

export interface ELMIdentifier {
  id: string;
  version: string;
}
