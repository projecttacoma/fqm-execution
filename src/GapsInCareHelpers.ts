import { R4 } from '@ahryman40k/ts-fhir-types';
import { v4 as uuidv4 } from 'uuid';
import {
  DataTypeQuery,
  DetailedPopulationGroupResult,
  ExpressionStackEntry,
  GapsDataTypeQuery,
  ReasonDetail
} from './types/Calculator';
import { FinalResult, ImprovementNotation, CareGapReasonCode, CareGapReasonCodeDisplay } from './types/Enums';
import {
  flattenFilters,
  generateDetailedCodeFilter,
  generateDetailedDateFilter,
  generateDetailedValueFilter
} from './helpers/DataRequirementHelpers';
import { EqualsFilter, InFilter, DuringFilter, AnyFilter, NotNullFilter } from './types/QueryFilterTypes';

/**
 * Iterate through base queries and add clause results for parent query and retrieve
 *
 * @param queries base queries parsed from ELM
 * @param detailedResult execution results for this patient
 * @returns same query info but with info about clause results for query and retrieve
 */
export function processQueriesForGaps(
  queries: DataTypeQuery[],
  detailedResult: DetailedPopulationGroupResult
): GapsDataTypeQuery[] {
  return queries.map(q => {
    // Determine satisfaction of parent query and leaf node retrieve
    const parentQueryResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === q.libraryName && cr.localId === q.queryLocalId
    );

    const retrieveResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === q.libraryName && cr.localId === q.retrieveLocalId
    );

    const parentQueryHasResult = parentQueryResult?.final === FinalResult.TRUE;
    const retrieveHasResult = retrieveResult?.final === FinalResult.TRUE;

    const gapQuery: GapsDataTypeQuery = {
      ...q,
      parentQueryHasResult,
      retrieveHasResult
    };

    return gapQuery;
  });
}

/**
 * Generate a FHIR DetectedIssue resource for Gaps in Care per http://build.fhir.org/ig/HL7/davinci-deqm/StructureDefinition-gaps-detectedissue-deqm.html
 *
 * @param queries numerator queries from a call to findRetrieves
 * @param measureReport FHIR MeasureReport to be referenced by the issue
 */
export function generateDetectedIssueResources(
  queries: GapsDataTypeQuery[],
  measureReport: R4.IMeasureReport,
  improvementNotation: string
): R4.IDetectedIssue[] {
  const relevantGapQueries = queries.filter(q =>
    // If positive improvement, we want queries with results as gaps. Vice versa for negative
    improvementNotation === ImprovementNotation.POSITIVE ? !q.parentQueryHasResult : q.parentQueryHasResult
  );
  const groupedQueries = groupGapQueries(relevantGapQueries);
  const guidanceResponses = groupedQueries.map(q =>
    generateGuidanceResponses(q, measureReport.measure, improvementNotation)
  );
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
export function groupGapQueries(queries: GapsDataTypeQuery[]): GapsDataTypeQuery[][] {
  const queryGroups = new Map<string, GapsDataTypeQuery[]>();
  const ungroupedQueries: GapsDataTypeQuery[][] = [];

  queries.forEach((q): void => {
    // Logic to determine grouped queries. Will likely get more complex
    // as query grouping evolves
    const stackOrEntry = getOrExpressionFromStack(q.expressionStack);

    if (stackOrEntry) {
      if (queryGroups.get(stackEntryString(stackOrEntry))) {
        // If we've already started a group for these queries, add to the group
        queryGroups.get(stackEntryString(stackOrEntry))?.push(q);
      } else {
        // Otherwise, start a new group
        queryGroups.set(stackEntryString(stackOrEntry), [q]);
      }
    } else {
      // collect queries that aren't part of a grouping
      ungroupedQueries.push([q]);
    }
  });

  return Array.from(queryGroups.values()).concat(ungroupedQueries);
}

/**
 * Detects scenario in expressionStack where this query is part of an "Or"
 * i.e. Either the first entry in the stack is an "Or," or it is an "ExpressionRef" right on top of an "Or"
 *
 * @param expressionStack the current expression stack for this query
 * @returns Matching "Or", or null if not found
 */
export function getOrExpressionFromStack(expressionStack?: ExpressionStackEntry[]): ExpressionStackEntry | null {
  if (expressionStack && expressionStack.length >= 2) {
    if (expressionStack[0].type === 'ExpressionRef') {
      return expressionStack[1].type === 'Or' ? expressionStack[1] : null;
    }

    return expressionStack[0].type === 'Or' ? expressionStack[0] : null;
  }

  return null;
}

function stackEntryString(entry: ExpressionStackEntry): string {
  return JSON.stringify(entry);
}

/**
 * Generate FHIR GuidanceResponse resources for queries that are gaps
 *
 * @param queries list of all queries that are gaps for this measure
 * @param measureURL fully qualified URL referencing the measure
 * @param improvementNotation ImprovementNotation.POSITIVE or ImprovementNotation.NEGATIVE
 * @returns list of FHIR GuidanceResponse resources with detailed gaps information
 */
export function generateGuidanceResponses(
  queries: GapsDataTypeQuery[],
  measureURL: string,
  improvementNotation: string
): R4.IGuidanceResponse[] {
  const guidanceResponses: R4.IGuidanceResponse[] = queries.map(q => {
    const dataTypeCodeFilter: { path: 'code'; valueSet?: string; code?: [{ code: string; system: string }] } = {
      path: 'code'
    };

    if (q.valueSet) {
      dataTypeCodeFilter.valueSet = q.valueSet;
    } else if (q.code) {
      dataTypeCodeFilter.code = [
        {
          code: q.code.code,
          system: q.code.system
        }
      ];
    }

    let gapCoding: R4.ICoding[];

    // TODO: update system to be full URL once defined
    if (q.reasonDetail?.hasReasonDetail && q.reasonDetail.reasons.length > 0) {
      gapCoding = q.reasonDetail.reasons.map(r => ({
        system: 'CareGapReasonCodeSystem',
        code: r.code,
        display: CareGapReasonCodeDisplay[r.code]
      }));
    } else {
      gapCoding =
        improvementNotation === ImprovementNotation.POSITIVE
          ? [
              {
                system: 'CareGapReasonCodeSystem',
                code: CareGapReasonCode.MISSING,
                display: CareGapReasonCodeDisplay[CareGapReasonCode.MISSING]
              }
            ]
          : [
              {
                system: 'CareGapReasonCodeSystem',
                code: CareGapReasonCode.PRESENT,
                display: CareGapReasonCodeDisplay[CareGapReasonCode.PRESENT]
              }
            ];
    }

    const gapStatus: R4.ICodeableConcept = {
      coding: gapCoding
    };

    const dataRequirement: R4.IDataRequirement = {
      type: q.dataType,
      codeFilter: [{ ...dataTypeCodeFilter }]
    };

    if (q.queryInfo) {
      const detailedFilters = flattenFilters(q.queryInfo.filter);

      detailedFilters.forEach(df => {
        if (df.type === 'equals' || df.type === 'in') {
          const cf = generateDetailedCodeFilter(df as EqualsFilter | InFilter, q.dataType);

          if (cf !== null) {
            dataRequirement.codeFilter?.push(cf);
          }
        } else if (df.type === 'during') {
          const dateFilter = generateDetailedDateFilter(df as DuringFilter);
          if (dataRequirement.dateFilter) {
            dataRequirement.dateFilter.push(dateFilter);
          } else {
            dataRequirement.dateFilter = [dateFilter];
          }
        } else {
          const valueFilter = generateDetailedValueFilter(df);
          if (valueFilter) {
            if (dataRequirement.extension) {
              dataRequirement.extension.push(valueFilter);
            } else {
              dataRequirement.extension = [valueFilter];
            }
          }
        }
      });
    }

    const guidanceResponse: R4.IGuidanceResponse = {
      resourceType: 'GuidanceResponse',
      id: uuidv4(),
      dataRequirement: [dataRequirement],
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
          return { reference: `DetectedIssue/${i.id}` };
        })
      }
    ]
  };
  const returnBundle: R4.IBundle = {
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
    returnBundle.entry?.push({ resource: i });
  });
  return returnBundle;
}

/**
 * Add reason detail data to each DataTypeQuery passed in
 *
 * @param retrieves numerator queries from a call to findRetrieves
 * @param improvementNotation string indicating positive or negative improvement notation for the measure being used
 * @param detailedResult result from calculation to look up clause values
 * @return mapped list of queries with reason detail info if relevant
 */
export function calculateReasonDetail(
  retrieves: GapsDataTypeQuery[],
  improvementNotation: string,
  detailedResult?: DetailedPopulationGroupResult
): GapsDataTypeQuery[] {
  return retrieves.map(r => {
    let reasonDetail: ReasonDetail;
    if (improvementNotation === ImprovementNotation.POSITIVE) {
      reasonDetail = {
        hasReasonDetail: r.retrieveHasResult === true && r.parentQueryHasResult === false,
        reasons: []
      };

      if (reasonDetail.hasReasonDetail && r.queryInfo && detailedResult?.clauseResults) {
        const flattenedFilters = flattenFilters(r.queryInfo.filter);

        flattenedFilters.forEach(f => {
          // Separate interval handling for 'during' filters
          if (f.type === 'during') {
            const duringFilter = f as DuringFilter;
            const resources = detailedResult.clauseResults?.find(
              cr => cr.libraryName === r.libraryName && cr.localId === r.retrieveLocalId
            );

            if (duringFilter.valuePeriod.interval && resources) {
              const path = duringFilter.attribute.split('.');
              const interval = duringFilter.valuePeriod.interval;

              // Access desired property of FHIRObject
              resources.raw.forEach((r: any) => {
                let desiredAttr = r;
                path.forEach(key => {
                  if (desiredAttr.value?.isDateTime) {
                    return;
                  }

                  desiredAttr = desiredAttr[key];
                });

                // Use DateOutOfRange code if data point is outside of the desired interval
                const isAttrContainedInInterval = interval.contains(desiredAttr.value);

                if (isAttrContainedInInterval === false) {
                  reasonDetail.reasons.push({ code: CareGapReasonCode.DATEOUTOFRANGE });
                }
              });
            }
          } else if (f.type === 'notnull') {
            const notNullFilter = f as NotNullFilter;
            const resources = detailedResult.clauseResults?.find(
              cr => cr.libraryName === r.libraryName && cr.localId === r.retrieveLocalId
            );
            const attrPath = notNullFilter.attribute.split('.');
            if (resources) {
              // Access desired property of FHIRObject
              resources.raw.forEach((r: any) => {
                let desiredAttr = r;
                attrPath.forEach(key => {
                  desiredAttr = desiredAttr[key];
                });

                // Use VALUEMISSING code if data is null
                if (desiredAttr === null || desiredAttr === undefined) {
                  reasonDetail.reasons.push({ code: CareGapReasonCode.VALUEMISSING });
                }
              });
            }
          } else {
            // TODO: This logic is not perfect, and can be corrupted by multiple resources spanning truthy values for all filters
            // For non-during filters, look up clause result by localId
            // Ideally we can look to modify cql-execution to help us with this flaw
            const clauseResult = detailedResult.clauseResults?.find(
              cr => cr.libraryName === r.libraryName && cr.localId === f.localId
            );

            // False clause means this specific filter was falsy
            if (clauseResult && clauseResult.final === FinalResult.FALSE) {
              const code = getGapReasonCode(f);
              if (code !== null) {
                reasonDetail.reasons.push({ code });
              }
            }
          }
        });
      }

      // If no specific reason details found, default is missing
      if (reasonDetail.hasReasonDetail && reasonDetail.reasons.length === 0) {
        reasonDetail.reasons = [{ code: CareGapReasonCode.MISSING }];
      }
    } else {
      // TODO: this can probably be expanded to address negative improvement cases, but it will be a bit more complicated
      reasonDetail = {
        hasReasonDetail: false,
        reasons: []
      };
    }
    return { ...r, reasonDetail };
  });
}

function getGapReasonCode(filter: AnyFilter): CareGapReasonCode | null {
  switch (filter.type) {
    case 'equals':
    case 'in':
      return CareGapReasonCode.INVALIDATTRIBUTE;
    case 'during':
      return CareGapReasonCode.DATEOUTOFRANGE;
    default:
      console.warn(`unknown reasonCode mapping for filter type ${filter.type}`);
      return null;
  }
}
