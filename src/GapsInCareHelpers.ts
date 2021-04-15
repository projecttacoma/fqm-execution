import { R4 } from '@ahryman40k/ts-fhir-types';
import { v4 as uuidv4 } from 'uuid';
import { DataTypeQuery, DetailedPopulationGroupResult, ExpressionStackEntry } from './types/Calculator';
import { ELM, ELMStatement } from './types/ELMTypes';
import { FinalResult, ImprovementNotation, CareGapReasonCode, CareGapReasonCodeDisplay } from './types/Enums';

/**
 * Get all data types, and codes/valuesets used in Retrieve ELM expressions
 *
 * @param elm main ELM library with expressions to traverse
 * @param deps list of any dependent ELM libraries included in the main ELM
 * @param expr expression to find queries under (usually numerator for gaps in care)
 * @param detailedResult detailed results from execution
 * @param queryLocalId keeps track of latest id of query statements for lookup later
 */
export function findRetrieves(
  elm: ELM,
  deps: ELM[],
  expr: ELMStatement,
  detailedResult: DetailedPopulationGroupResult,
  queryLocalId?: string,
  expressionStack: ExpressionStackEntry[] = []
) {
  const results: DataTypeQuery[] = [];

  // Push this expression onto the stack of processed expressions
  if (expr.localId && expr.type) {
    expressionStack.push({
      libraryName: elm.library.identifier.id,
      localId: expr.localId,
      type: expr.type
    });
  }

  // Base case, get data type and code/valueset off the expression
  if (expr.type === 'Retrieve' && expr.dataType) {
    // Determine satisfaction of parent query and leaf node retrieve
    const parentQueryResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === elm.library.identifier.id && cr.localId === queryLocalId
    );
    const retrieveResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === elm.library.identifier.id && cr.localId === expr.localId
    );
    const parentQueryHasResult = parentQueryResult?.final === FinalResult.TRUE;
    const retrieveHasResult = retrieveResult?.final === FinalResult.TRUE;

    // If present, strip off HL7 prefix to data type
    const dataType = expr.dataType.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '');

    if (expr.codes?.type === 'ValueSetRef') {
      const valueSet = elm.library.valueSets?.def.find(v => v.name === expr.codes.name);
      if (valueSet) {
        results.push({
          dataType,
          valueSet: valueSet.id,
          parentQueryHasResult,
          retrieveHasResult,
          queryLocalId,
          retrieveLocalId: expr.localId,
          libraryName: elm.library.identifier.id,
          expressionStack: [...expressionStack]
        });
      }
    } else if (
      expr.codes.type === 'CodeRef' ||
      (expr.codes.type === 'ToList' && expr.codes.operand?.type === 'CodeRef')
    ) {
      // ToList promotions have the CodeRef on the operand
      const codeName = expr.codes.type === 'CodeRef' ? expr.codes.name : expr.codes.operand.name;
      const code = elm.library.codes?.def.find(c => c.name === codeName);
      if (code) {
        results.push({
          dataType,
          code: {
            system: code.codeSystem.name,
            code: code.id
          },
          parentQueryHasResult,
          retrieveHasResult,
          queryLocalId,
          retrieveLocalId: expr.localId,
          libraryName: elm.library.identifier.id,
          expressionStack: [...expressionStack]
        });
      }
    }

  } else if (expr.type === 'Query') {
    // Queries have the source array containing the expressions
    expr.source?.forEach(s => {
      results.push(...findRetrieves(elm, deps, s.expression, detailedResult, expr.localId, [...expressionStack]));
    });
  } else if (expr.type === 'ExpressionRef') {
    // Find expression in dependent library
    if (expr.libraryName) {
      const matchingLib = deps.find(d => d.library.identifier.id === expr.libraryName);
      const exprRef = matchingLib?.library.statements.def.find(e => e.name === expr.name);
      if (matchingLib && exprRef) {
        results.push(
          ...findRetrieves(matchingLib, deps, exprRef.expression, detailedResult, queryLocalId, [...expressionStack])
        );
      }
    } else {
      // Find expression in current library
      const exprRef = elm.library.statements.def.find(d => d.name === expr.name);
      if (exprRef) {
        results.push(...findRetrieves(elm, deps, exprRef.expression, detailedResult, queryLocalId, [...expressionStack]));
      }
    }
  } else if (expr.operand) {
    // Operand can be array or object. Recurse on either
    if (Array.isArray(expr.operand)) {
      expr.operand.forEach(e => {
        results.push(...findRetrieves(elm, deps, e, detailedResult, queryLocalId, [...expressionStack]));
      });
    } else {
      results.push(...findRetrieves(elm, deps, expr.operand, detailedResult, queryLocalId, [...expressionStack]));
    }
  }
  return results;
}

/**
 * Generate a FHIR DetectedIssue resource for Gaps in Care per http://build.fhir.org/ig/HL7/davinci-deqm/StructureDefinition-gaps-detectedissue-deqm.html
 *
 * @param queries numerator queries from a call to findRetrieves
 * @param measureReport FHIR MeasureReport to be referenced by the issue
 */
export function generateDetectedIssueResources(
  queries: DataTypeQuery[],
  measureReport: R4.IMeasureReport,
  improvementNotation: string
): R4.IDetectedIssue[] {
  const relevantGapQueries = queries.filter(q =>
    // If positive improvement, we want queries with results as gaps. Vice versa for negative
    improvementNotation === ImprovementNotation.POSITIVE ? !q.parentQueryHasResult : q.parentQueryHasResult
  );
  const groupedQueries = groupGapQueries(relevantGapQueries);
  const guidanceResponses = groupedQueries.map(q => generateGuidanceResponses(q, measureReport.measure, improvementNotation));
  return guidanceResponses.map(gr => {
      return {
        resourceType: 'DetectedIssue',
        id: uuidv4(),
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/detectedissue-category',
              code: 'care-gap',
              display: 'Gap in Care Detected'
            }
          ]
        },
        evidence: gr.map(gr => {
          return {
            detail: [{ reference: `#${gr.id}` }]
          };
        }),
        contained: gr
      };
    });
}

/**
 * "Groups" gaps queries that are functionally the same in terms of putting a patient into the improvement population
 * (whether that is the numerator or the denominator, depending on the improvement notation). For the moment, only handles
 * "or"-d queries, where any one of the listed DataTypeQuery objects would put the patient into the improvement population.
 * 
 * @param queries list of queries from the execution engine.
 * @returns an array of arrays of type DataTypeQuery
 */
export function groupGapQueries(queries: DataTypeQuery[]):DataTypeQuery[][]  {
  const queryGroups = new Map<string, DataTypeQuery[]>();
  const ungroupedQueries:DataTypeQuery[][] = [];

  queries.forEach((q):void => {
    const stackEntry = q.expressionStack ? q.expressionStack[0] : undefined;
    // Logic to determine grouped queries. Will likely get more complex
    // as query grouping evolves
    if (stackEntry && stackEntry.type == 'Or') {
      if (queryGroups.get(stackEntryString(stackEntry))) {
        // If we've already started a group for these queries, add to the grou
        queryGroups.get(stackEntryString(stackEntry))?.push(q);
      } else {
        // Otherwise, start a new group
        queryGroups.set(stackEntryString(stackEntry), [q]);
      }
    } else {
      // collect queries that aren't part of a grouping
      ungroupedQueries.push([q]);
    }
  });

  return Array.from(queryGroups.values()).concat(ungroupedQueries);
}

function stackEntryString(entry:ExpressionStackEntry):string {
  return JSON.stringify(entry);
}

function generateGuidanceResponses(
  queries: DataTypeQuery[],
  measureURL: string,
  improvementNotation: string
): R4.IGuidanceResponse[] {
  const guidanceResponses: R4.IGuidanceResponse[] = queries.map(q => {
    const codeFilter: { path: 'code'; valueSet?: string; code?: [{ code: string; system: string }] } = {
      path: 'code'
    };

    if (q.valueSet) {
      codeFilter.valueSet = q.valueSet;
    } else if (q.code) {
      codeFilter.code = [
        {
          code: q.code.code,
          system: q.code.system
        }
      ];
    }

    // TODO: update system to be full URL once defined
    const gapCoding: R4.ICoding =
      improvementNotation === ImprovementNotation.POSITIVE
        ? {
            system: 'CareGapReasonCodeSystem',
            code: CareGapReasonCode.MISSING,
            display: CareGapReasonCodeDisplay[CareGapReasonCode.MISSING]
          }
        : {
            system: 'CareGapReasonCodeSystem',
            code: CareGapReasonCode.PRESENT,
            display: CareGapReasonCodeDisplay[CareGapReasonCode.PRESENT]
          };

    const gapStatus: R4.ICodeableConcept = {
      coding: [gapCoding]
    };
    const guidanceResponse: R4.IGuidanceResponse = {
      resourceType: 'GuidanceResponse',
      id: uuidv4(),
      dataRequirement: [
        {
          type: q.dataType,
          codeFilter: [{ ...codeFilter }]
        }
      ],
      reasonCode: [gapStatus],
      status: R4.GuidanceResponseStatusKind._dataRequired,
      moduleUri: measureURL
    };
    return guidanceResponse;
  });
  return guidanceResponses;
}

/**
 * Generate a Gaps in Care Bundle resource per http://build.fhir.org/ig/HL7/davinci-deqm/StructureDefinition-gaps-bundle-deqm.html
 *
 * @param detectedIssue FHIR DetectedIssue generated during gaps
 * @param measureReport FHIR MeasureReport generated during calculation
 * @param patient Current FHIR Patient processed in execution
 */
export function generateGapsInCareBundle(
  detectedIssues: R4.IDetectedIssue[],
  measureReport: R4.IMeasureReport,
  patient: R4.IPatient
): R4.IBundle {
  const composition: R4.IComposition = {
    resourceType: 'Composition',
    type: {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/gaps-doc-type',
          code: 'gaps-doc',
          display: 'Gaps in Care Report'
        }
      ]
    },
    author: [{ ...measureReport.subject }],
    subject: measureReport.subject,
    date: new Date().toISOString(),
    title: 'Gaps in Care Report',
    section: [
      {
        title: measureReport.measure,
        focus: {
          reference: `MeasureReport/${measureReport.id}`
        },
        entry: detectedIssues.map(i => {
          return { reference: `DetectedIssue/${i.id}`};
        })
      }
    ]
  };
  const returnBundle:R4.IBundle = {
    resourceType: 'Bundle',
    type: R4.BundleTypeKind._document,
    entry: [
      {
        resource: composition
      },
      {
        resource: measureReport
      },
      {
        resource: patient
      }
    ]
  };
  detectedIssues.forEach(i => {
    returnBundle.entry?.push({ resource: i});
  });
  return returnBundle;
}

/**
 * Add near miss data to each DataTypeQuery passed in
 *
 * @param retrieves numerator queries from a call to findRetrieves
 * @param improvementNotation string indicating positive or negative improvement notation for the measure being used
 */
export function calculateNearMisses(retrieves: DataTypeQuery[], improvementNotation: string): DataTypeQuery[] {
  return retrieves.map(r => {
    let isNearMiss;
    if (improvementNotation === ImprovementNotation.POSITIVE) {
      isNearMiss = r.retrieveHasResult && !r.parentQueryHasResult;
    } else {
      // TODO: this can probably be expanded to address negative improvement cases, but it will be a bit more complicated
      isNearMiss = false;
    }
    return { ...r, isNearMiss };
  });
}
