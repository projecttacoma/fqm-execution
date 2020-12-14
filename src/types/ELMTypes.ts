/** Top level of an ELM JSON. */
export interface ELM {
  /** ELM Library definition. */
  library: ELMLibrary;
}

/**
 * Definition of an ELM Library. Most relevant information is accessed from
 * this level of the ELM tree.
 */
export interface ELMLibrary {
  annotation?: any;
  /** Identifier for this library. */
  identifier: ELMIdentifier;
  /** Identifier for the version of ELM. */
  schemaIdentifier: ELMIdentifier;
  /** Indication of data types that are used in this library. */
  usings: any;
  /** Include statements that bring in other ELM Libraries for local use. */
  includes?: {
    /** List of include statement definitions. */
    def: ELMInclude[];
  };
  /** Parameters for this ELM Library. ex. Measurement Period */
  parameters?: any;
  /** Code Systems defined for local use. */
  codeSystems?: any;
  /** ValueSet definitions in the ELM Library. */
  valueSets?: {
    /** List of valueset statement definitions. */
    def: ELMValueSet[];
  };
  /** Direct reference code statements. */
  codes?: {
    def: ELMCode[];
  };
  /** Standard define or define function statements. The actual logic is defined here. */
  statements: {
    /** List of statement definitions. */
    def: ELMStatement[];
  };
}

/** Identifies an ELM Library or schema with an id and version. */
export interface ELMIdentifier {
  id: string;
  version: string;
  system?: string;
}

/**
 * Definition of an include statement that indicates another ELM Library
 * should be loaded to be use by this library.
 */
export interface ELMInclude {
  /** Clause id. */
  localId?: string;
  /** Locator in the original CQL file. Only exists if compiled with this info. */
  locator?: string;
  /** Local identifier that will be used to reference this library in the logic. */
  localIdentifier: string;
  /** The id of the refereced library. */
  path: string;
  /** The version of the referenced library. */
  version: string;
}

/**
 * ELM define or define function statement.
 */
export interface ELMStatement {
  /** Clause id. This is used to reference logic to the annotation structure. */
  localId?: string;
  /** Locator in the original CQL file. Only exists if compiled with this info. */
  locator?: string;
  /** Name of the statement. */
  name: string;
  /** The context of this statement. Usually 'Patient'. */
  context: string;
  /** The access level of this statement. Usually 'Public'. */
  accessLevel?: string;
  /**
   * Annotation structure for this statement. Can be used to build the CQL file with
   * reference indicators to the corresponding logic for each clause.
   */
  annotation?: Annotation[];
  /** The executable expression for this statement. */
  expression?: any;
  /** Type of this statement. Will be 'FunctionDef' if it is a function. */
  type?: string;
  /** Definition function parameters if this is a function. */
  operand?: any;
  /** Used in query expressions */
  source?: any[];
  /** Used in expression refs */
  libraryName?: string;
  /** Used in retrieves */
  dataType?: string;
  /** Used in retrieves */
  codes?: any;
}

/**
 * ELM ValueSet definition.
 */
export interface ELMValueSet {
  /** Clause id. */
  localId: string;
  /** Locator in the original CQL file. Only exists if compiled with this info. */
  locator?: string;
  /** The name of the the valueset that is used to locally reference this valueset. */
  name: string;
  /** The external identifier for the valueset. In FHIR this should be a Canonical URL. */
  id: string;
  /** The access level of this valueset. Usually 'Public'. */
  accessLevel?: string;
  /** Version of the valueset. Should not be used in eCQM land. */
  version?: string;
}

/**
 * ELM Code definition
 */
export interface ELMCode {
  id: string;
  name: string;
  accessLevel: string;
  codeSystem: {
    name: string;
  };
}

export interface LibraryDependencyInfo {
  /** The library id */
  libraryId: string;
  /** The library version */
  libraryVersion: string;
  /** List of all statements and what statements they reference. */
  statementDependencies: StatementDependency[];
}

export interface StatementDependency {
  statementName: string;
  statementReferences: StatementReference[];
}

export interface StatementReference {
  libraryId: string;
  statementName: string;
}

/**
 * Annotation on an ELM expression
 */
export interface Annotation {
  type: string;
  s: AnnotationStatement;
}

/**
 * Recursive statement object for an ELM Annotation
 */
export interface AnnotationStatement {
  r?: string;
  s?: AnnotationStatement[];
  value?: string[];
}
