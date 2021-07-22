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
  codeSystems?: {
    def: ELMCodeSystem[];
  };
  /** ValueSet definitions in the ELM Library. */
  valueSets?: {
    /** List of valueset statement definitions. */
    def: ELMValueSet[];
  };
  /** Direct reference code statements. */
  codes?: {
    def: ELMCode[];
  };
  concepts?: {
    def: ELMConcept[];
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
  expression: AnyELMExpression;
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
  annotation?: Annotation[];
}

/**
 * ELM Code definition
 */
export interface ELMCode {
  id: string;
  name: string;
  accessLevel: string;
  display?: string;
  codeSystem: {
    name: string;
  };
}

export interface ELMCodeSystem {
  /** CodeSystem id */
  id: string;
  /** The name of the codesystem taht is used to locally reference this codesystem */
  name: string;
  /** versioned name of the codesystem */
  version?: string;
  /** The access level of this valueset. Usually 'Public'. */
  accessLevel?: string;
}

export interface ELMConcept {
  name: string;
  display: string;
  accessLevel: string;
  code: {
    name: string;
  }[];
}

/**
 * Abstract ELM Expression.
 */
export interface ELMExpression {
  /** Type of expression. */
  type: string;
  /** Clause id for this expression. */
  localId?: string;
  /** Locator in the original CQL file. Only exists if compiled with this info. */
  locator?: string;
}

export type AnyELMExpression =
  | ELMExpression
  | ELMRetrieve
  | ELMValueSetRef
  | ELMCodeRef
  | ELMQuery
  | ELMAs
  | ELMEqual
  | ELMGreaterOrEqual
  | ELMEquivalent
  | ELMAnd
  | ELMOr
  | ELMIsNull
  | ELMToList
  | ELMIncludedIn
  | ELMIn
  | ELMEnd
  | ELMStart
  | ELMToDateTime
  | ELMExpressionRef
  | ELMFunctionRef
  | ELMParameterRef
  | ELMProperty
  | ELMAliasRef
  | ELMConceptRef
  | ELMLiteral
  | ELMQuantity
  | ELMInterval
  | ELMList
  | ELMTuple;

export interface ELMRetrieve extends ELMExpression {
  type: 'Retrieve';
  dataType: string;
  templateId?: string;
  codeProperty?: string;
  codes?: AnyELMExpression;
}

export interface ELMValueSetRef extends ELMExpression {
  type: 'ValueSetRef';
  name: string;
  libraryName?: string;
}

export interface ELMCodeRef extends ELMExpression {
  type: 'CodeRef';
  name: string;
  libraryName?: string;
}

export interface ELMQuery extends ELMExpression {
  type: 'Query';
  source: ELMAliasedQuerySource[];
  let: ELMLetClause[];
  relationship: ELMRelationshipClause[];
  where?: AnyELMExpression;
  return?: ELMReturnClause;
  sort?: any;
}

export interface ELMAliasedQuerySource {
  /** Clause id for this alias. */
  localId?: string;
  /** Locator in the original CQL file. Only exists if compiled with this info. */
  locator?: string;
  /** Expression to fetch the source for the query. */
  expression: AnyELMExpression;
  /** Named alias to reference in the query scope. */
  alias: string;
}

export interface ELMRelationshipClause extends ELMAliasedQuerySource {
  suchThat: AnyELMExpression;
}

export interface ELMLetClause {
  /** Clause id for this alias. */
  localId?: string;
  /** Locator in the original CQL file. Only exists if compiled with this info. */
  locator?: string;
  /** Expression to fetch the source for the query. */
  expression: AnyELMExpression;
  /** Named alias to reference in the query scope. */
  identifier: string;
}

export interface ELMReturnClause {
  expression: AnyELMExpression;
  distinct?: boolean;
}

export interface ELMAs extends ELMExpression {
  type: 'As';
  asType: string;
  operand: AnyELMExpression;
}

export interface ELMBinaryExpression extends ELMExpression {
  operand: [AnyELMExpression, AnyELMExpression];
}

export interface ELMUnaryExpression extends ELMExpression {
  operand: AnyELMExpression;
}

export interface ELMEqual extends ELMBinaryExpression {
  type: 'Equal';
}

export interface ELMGreaterOrEqual extends ELMBinaryExpression {
  type: 'GreaterOrEqual';
}

export interface ELMEquivalent extends ELMBinaryExpression {
  type: 'Equivalent';
}

export interface ELMAnd extends ELMBinaryExpression {
  type: 'And';
}

export interface ELMOr extends ELMBinaryExpression {
  type: 'Or';
}

export interface ELMNot extends ELMUnaryExpression {
  type: 'Not';
}

export interface ELMIsNull extends ELMUnaryExpression {
  type: 'IsNull';
}

export interface ELMToList extends ELMUnaryExpression {
  type: 'ToList';
}
export interface ELMIncludedIn extends ELMBinaryExpression {
  type: 'IncludedIn';
}

export interface ELMIn extends ELMBinaryExpression {
  type: 'In';
}

export interface ELMEnd extends ELMUnaryExpression {
  type: 'End';
}

export interface ELMStart extends ELMUnaryExpression {
  type: 'Start';
}

export interface ELMToDateTime extends ELMUnaryExpression {
  type: 'ToDateTime';
}

interface ELMIExpressionRef extends ELMExpression {
  name: string;
  libraryName?: string;
}

export interface ELMExpressionRef extends ELMIExpressionRef {
  type: 'ExpressionRef';
}

export interface ELMFunctionRef extends ELMIExpressionRef {
  type: 'FunctionRef';
  signature?: [any];
  operand: AnyELMExpression[];
}

export interface ELMParameterRef extends ELMIExpressionRef {
  type: 'ParameterRef';
}

export interface ELMProperty extends ELMExpression {
  type: 'Property';
  source?: AnyELMExpression;
  path: string;
  scope?: string;
}

export interface ELMAliasRef extends ELMExpression {
  type: 'AliasRef';
  name: 'string';
}

export interface ELMConceptRef extends ELMExpression {
  type: 'ConceptRef';
  name: string;
}

export interface ELMLiteral extends ELMExpression {
  type: 'Literal';
  valueType: string;
  value?: string | number;
}

export interface ELMQuantity extends ELMExpression {
  type: 'Quantity';
  unit?: string;
  value?: number;
}

export interface ELMInterval extends ELMExpression {
  type: 'Interval';
  lowClosed?: boolean;
  highClosed?: boolean;
  low?: AnyELMExpression;
  high?: AnyELMExpression;
}

export interface ELMList extends ELMExpression {
  type: 'List';
  element: ELMLiteral[];
}

export interface ELMTuple extends ELMExpression {
  type: 'Tuple';
  element: ELMTupleElement[];
}

export interface ELMTupleElement {
  name: string;
  value: AnyELMExpression;
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
