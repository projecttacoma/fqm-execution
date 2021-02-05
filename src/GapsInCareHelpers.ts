import { R4 } from '@ahryman40k/ts-fhir-types';
import { v4 as uuidv4 } from 'uuid';
import { DataTypeQuery, DetailedPopulationGroupResult } from './types/Calculator';
import { ELM, ELMStatement } from './types/ELMTypes';
import { FinalResult } from './types/Enums';

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
  queryLocalId?: string
) {
  const results: DataTypeQuery[] = [];

  // Base case, get data type and code/valueset off the expression
  if (expr.type === 'Retrieve' && expr.dataType) {
    // Determine satisfaction of parent query and leaf node retrieve
    const parentQueryResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === elm.library.identifier.id && cr.localId === queryLocalId
    );
    const retrieveResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === elm.library.identifier.id && cr.localId === expr.localId
    );
    const parentQuerySatisfied = parentQueryResult?.final === FinalResult.TRUE;
    const retrieveSatisfied = retrieveResult?.final === FinalResult.TRUE;

    // If present, strip off HL7 prefix to data type
    const dataType = expr.dataType.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '');

    if (expr.codes?.type === 'ValueSetRef') {
      const valueSet = elm.library.valueSets?.def.find(v => v.name === expr.codes.name);
      if (valueSet) {
        results.push({
          dataType,
          valueSet: valueSet.id,
          parentQuerySatisfied,
          retrieveSatisfied,
          queryLocalId,
          retrieveLocalId: expr.localId,
          libraryName: elm.library.identifier.id
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
          parentQuerySatisfied,
          retrieveSatisfied,
          queryLocalId,
          retrieveLocalId: expr.localId,
          libraryName: elm.library.identifier.id
        });
      }
    }
  } else if (expr.type === 'Query') {
    // Queries have the source array containing the expressions
    expr.source?.forEach(s => {
      results.push(...findRetrieves(elm, deps, s.expression, detailedResult, expr.localId));
    });
  } else if (expr.type === 'ExpressionRef') {
    // Find expression in dependent library
    if (expr.libraryName) {
      const matchingLib = deps.find(d => d.library.identifier.id === expr.libraryName);
      const exprRef = matchingLib?.library.statements.def.find(e => e.name === expr.name);
      if (matchingLib && exprRef) {
        results.push(...findRetrieves(matchingLib, deps, exprRef.expression, detailedResult, queryLocalId));
      }
    } else {
      // Find expression in current library
      const exprRef = elm.library.statements.def.find(d => d.name === expr.name);
      if (exprRef) {
        results.push(...findRetrieves(elm, deps, exprRef.expression, detailedResult, queryLocalId));
      }
    }
  } else if (expr.operand) {
    // Operand can be array or object. Recurse on either
    if (Array.isArray(expr.operand)) {
      expr.operand.forEach(e => {
        results.push(...findRetrieves(elm, deps, e, detailedResult, queryLocalId));
      });
    } else {
      results.push(...findRetrieves(elm, deps, expr.operand, detailedResult, queryLocalId));
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
export function generateDetectedIssueResource(
  queries: DataTypeQuery[],
  measureReport: R4.IMeasureReport
): R4.IDetectedIssue {
  const guidanceResponses = generateGuidanceResponses(queries, measureReport.measure);
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
    evidence: guidanceResponses.map(gr => {
      return {
        detail: [{ reference: `#${gr.id}` }]
      };
    }),
    contained: guidanceResponses
  };
}

function generateGuidanceResponses(queries: DataTypeQuery[], measureURL: string): R4.IGuidanceResponse[] {
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
    // TODO: for negative improvement, use either missing or present gapStatus code
    const gapStatus: R4.ICodeableConcept = {
      coding: [
        {
          system: 'CareGapReasonCodeSystem', // to be published TODO: update to full url
          code: 'Missing',
          display: 'No Data Element found from Value Set'
        }
      ]
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
  detectedIssue: R4.IDetectedIssue,
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
        entry: [
          {
            reference: `DetectedIssue/${detectedIssue.id}`
          }
        ]
      }
    ]
  };
  return {
    resourceType: 'Bundle',
    type: R4.BundleTypeKind._document,
    entry: [
      {
        resource: composition
      },
      {
        resource: detectedIssue
      },
      {
        resource: measureReport
      },
      {
        resource: patient
      }
    ]
  };
}
