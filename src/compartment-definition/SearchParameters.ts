// Taken from https://hl7.org/fhir/search-parameters.json
// Includes only date type search parameters
export const SearchParameters = {
  resourceType: 'Bundle',
  id: 'searchParams',
  meta: {
    lastUpdated: '2022-05-28T12:47:40.239+10:00'
  },
  type: 'collection',
  entry: [
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Resource-lastUpdated',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Resource-lastUpdated',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Resource-lastUpdated',
        version: '4.3.0',
        name: '_lastUpdated',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'When the resource version last changed',
        code: '_lastUpdated',
        base: ['Resource'],
        type: 'date',
        expression: 'Resource.meta.lastUpdated',
        xpath: 'f:Resource/f:meta/f:lastUpdated',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Account-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Account-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Account-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'Transaction window',
        code: 'period',
        base: ['Account'],
        type: 'date',
        expression: 'Account.servicePeriod',
        xpath: 'f:Account/f:servicePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ActivityDefinition-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ActivityDefinition-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ActivityDefinition-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The activity definition publication date',
        code: 'date',
        base: ['ActivityDefinition'],
        type: 'date',
        expression: 'ActivityDefinition.date',
        xpath: 'f:ActivityDefinition/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ActivityDefinition-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ActivityDefinition-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ActivityDefinition-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the activity definition is intended to be in use',
        code: 'effective',
        base: ['ActivityDefinition'],
        type: 'date',
        expression: 'ActivityDefinition.effectivePeriod',
        xpath: 'f:ActivityDefinition/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/AdverseEvent-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'AdverseEvent-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/AdverseEvent-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'When the event occurred',
        code: 'date',
        base: ['AdverseEvent'],
        type: 'date',
        expression: 'AdverseEvent.date',
        xpath: 'f:AdverseEvent/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/clinical-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'clinical-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/clinical-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description:
          "Multiple Resources: \r\n\r\n* [AllergyIntolerance](allergyintolerance.html): Date first version of the resource instance was recorded\r\n* [CarePlan](careplan.html): Time period plan covers\r\n* [CareTeam](careteam.html): Time period team covers\r\n* [ClinicalImpression](clinicalimpression.html): When the assessment was documented\r\n* [Composition](composition.html): Composition editing time\r\n* [Consent](consent.html): When this Consent was created or indexed\r\n* [DiagnosticReport](diagnosticreport.html): The clinically relevant time of the report\r\n* [Encounter](encounter.html): A date within the period the Encounter lasted\r\n* [EpisodeOfCare](episodeofcare.html): The provided date search value falls within the episode of care's period\r\n* [FamilyMemberHistory](familymemberhistory.html): When history was recorded or last updated\r\n* [Flag](flag.html): Time period when flag is active\r\n* [Immunization](immunization.html): Vaccination  (non)-Administration Date\r\n* [List](list.html): When the list was prepared\r\n* [Observation](observation.html): Obtained date/time. If the obtained element is a period, a date that falls in the period\r\n* [Procedure](procedure.html): When the procedure was performed\r\n* [RiskAssessment](riskassessment.html): When was assessment made?\r\n* [SupplyRequest](supplyrequest.html): When the request was made\r\n",
        code: 'date',
        base: [
          'AllergyIntolerance',
          'CarePlan',
          'CareTeam',
          'ClinicalImpression',
          'Composition',
          'Consent',
          'DiagnosticReport',
          'Encounter',
          'EpisodeOfCare',
          'FamilyMemberHistory',
          'Flag',
          'Immunization',
          'List',
          'Observation',
          'Procedure',
          'RiskAssessment',
          'SupplyRequest'
        ],
        type: 'date',
        expression:
          'AllergyIntolerance.recordedDate | CarePlan.period | CareTeam.period | ClinicalImpression.date | Composition.date | Consent.dateTime | DiagnosticReport.effective | Encounter.period | EpisodeOfCare.period | FamilyMemberHistory.date | Flag.period | (Immunization.occurrence as dateTime) | List.date | Observation.effective | Procedure.performed | (RiskAssessment.occurrence as dateTime) | SupplyRequest.authoredOn',
        xpath:
          'f:AllergyIntolerance/f:recordedDate | f:CarePlan/f:period | f:CareTeam/f:period | f:ClinicalImpression/f:date | f:Composition/f:date | f:Consent/f:dateTime | f:DiagnosticReport/f:effectiveDateTime | f:DiagnosticReport/f:effectivePeriod | f:Encounter/f:period | f:EpisodeOfCare/f:period | f:FamilyMemberHistory/f:date | f:Flag/f:period | f:Immunization/f:occurrenceDateTime | f:Immunization/f:occurrenceString | f:List/f:date | f:Observation/f:effectiveDateTime | f:Observation/f:effectivePeriod | f:Observation/f:effectiveTiming | f:Observation/f:effectiveInstant | f:Procedure/f:performedDateTime | f:Procedure/f:performedPeriod | f:Procedure/f:performedString | f:Procedure/f:performedAge | f:Procedure/f:performedRange | f:RiskAssessment/f:occurrenceDateTime | f:SupplyRequest/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/AllergyIntolerance-last-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'AllergyIntolerance-last-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/AllergyIntolerance-last-date',
        version: '4.3.0',
        name: 'last-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Date(/time) of last known occurrence of a reaction',
        code: 'last-date',
        base: ['AllergyIntolerance'],
        type: 'date',
        expression: 'AllergyIntolerance.lastOccurrence',
        xpath: 'f:AllergyIntolerance/f:lastOccurrence',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/AllergyIntolerance-onset',
      resource: {
        resourceType: 'SearchParameter',
        id: 'AllergyIntolerance-onset',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/AllergyIntolerance-onset',
        version: '4.3.0',
        name: 'onset',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Date(/time) when manifestations showed',
        code: 'onset',
        base: ['AllergyIntolerance'],
        type: 'date',
        expression: 'AllergyIntolerance.reaction.onset',
        xpath: 'f:AllergyIntolerance/f:reaction/f:onset',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Appointment-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Appointment-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Appointment-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'Appointment date/time.',
        code: 'date',
        base: ['Appointment'],
        type: 'date',
        expression: 'Appointment.start',
        xpath: 'f:Appointment/f:start',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/AuditEvent-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'AuditEvent-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/AuditEvent-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Security)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/secure/index.cfm'
              }
            ]
          }
        ],
        description: 'Time when the event was recorded',
        code: 'date',
        base: ['AuditEvent'],
        type: 'date',
        expression: 'AuditEvent.recorded',
        xpath: 'f:AuditEvent/f:recorded',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Basic-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Basic-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Basic-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'When created',
        code: 'created',
        base: ['Basic'],
        type: 'date',
        expression: 'Basic.created',
        xpath: 'f:Basic/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Bundle-timestamp',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Bundle-timestamp',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Bundle-timestamp',
        version: '4.3.0',
        name: 'timestamp',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'When the bundle was assembled',
        code: 'timestamp',
        base: ['Bundle'],
        type: 'date',
        expression: 'Bundle.timestamp',
        xpath: 'f:Bundle/f:timestamp',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/conformance-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'conformance-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/conformance-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description:
          'Multiple Resources: \r\n\r\n* [CapabilityStatement](capabilitystatement.html): The capability statement publication date\r\n* [CodeSystem](codesystem.html): The code system publication date\r\n* [CompartmentDefinition](compartmentdefinition.html): The compartment definition publication date\r\n* [ConceptMap](conceptmap.html): The concept map publication date\r\n* [GraphDefinition](graphdefinition.html): The graph definition publication date\r\n* [ImplementationGuide](implementationguide.html): The implementation guide publication date\r\n* [MessageDefinition](messagedefinition.html): The message definition publication date\r\n* [NamingSystem](namingsystem.html): The naming system publication date\r\n* [OperationDefinition](operationdefinition.html): The operation definition publication date\r\n* [SearchParameter](searchparameter.html): The search parameter publication date\r\n* [StructureDefinition](structuredefinition.html): The structure definition publication date\r\n* [StructureMap](structuremap.html): The structure map publication date\r\n* [TerminologyCapabilities](terminologycapabilities.html): The terminology capabilities publication date\r\n* [ValueSet](valueset.html): The value set publication date\r\n',
        code: 'date',
        base: [
          'CapabilityStatement',
          'CodeSystem',
          'CompartmentDefinition',
          'ConceptMap',
          'GraphDefinition',
          'ImplementationGuide',
          'MessageDefinition',
          'NamingSystem',
          'OperationDefinition',
          'SearchParameter',
          'StructureDefinition',
          'StructureMap',
          'TerminologyCapabilities',
          'ValueSet'
        ],
        type: 'date',
        expression:
          'CapabilityStatement.date | CodeSystem.date | CompartmentDefinition.date | ConceptMap.date | GraphDefinition.date | ImplementationGuide.date | MessageDefinition.date | NamingSystem.date | OperationDefinition.date | SearchParameter.date | StructureDefinition.date | StructureMap.date | TerminologyCapabilities.date | ValueSet.date',
        xpath:
          'f:CapabilityStatement/f:date | f:CodeSystem/f:date | f:CompartmentDefinition/f:date | f:ConceptMap/f:date | f:GraphDefinition/f:date | f:ImplementationGuide/f:date | f:MessageDefinition/f:date | f:NamingSystem/f:date | f:OperationDefinition/f:date | f:SearchParameter/f:date | f:StructureDefinition/f:date | f:StructureMap/f:date | f:TerminologyCapabilities/f:date | f:ValueSet/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/CarePlan-activity-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'CarePlan-activity-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/CarePlan-activity-date',
        version: '4.3.0',
        name: 'activity-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Specified date occurs within period specified by CarePlan.activity.detail.scheduled[x]',
        code: 'activity-date',
        base: ['CarePlan'],
        type: 'date',
        expression: 'CarePlan.activity.detail.scheduled',
        xpath:
          'f:CarePlan/f:activity/f:detail/f:scheduledTiming | f:CarePlan/f:activity/f:detail/f:scheduledPeriod | f:CarePlan/f:activity/f:detail/f:scheduledString',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ChargeItem-entered-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ChargeItem-entered-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ChargeItem-entered-date',
        version: '4.3.0',
        name: 'entered-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'Date the charge item was entered',
        code: 'entered-date',
        base: ['ChargeItem'],
        type: 'date',
        expression: 'ChargeItem.enteredDate',
        xpath: 'f:ChargeItem/f:enteredDate',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ChargeItem-occurrence',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ChargeItem-occurrence',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ChargeItem-occurrence',
        version: '4.3.0',
        name: 'occurrence',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'When the charged service was applied',
        code: 'occurrence',
        base: ['ChargeItem'],
        type: 'date',
        expression: 'ChargeItem.occurrence',
        xpath: 'f:ChargeItem/f:occurrenceDateTime | f:ChargeItem/f:occurrencePeriod | f:ChargeItem/f:occurrenceTiming',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ChargeItemDefinition-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ChargeItemDefinition-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ChargeItemDefinition-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'The charge item definition publication date',
        code: 'date',
        base: ['ChargeItemDefinition'],
        type: 'date',
        expression: 'ChargeItemDefinition.date',
        xpath: 'f:ChargeItemDefinition/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ChargeItemDefinition-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ChargeItemDefinition-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ChargeItemDefinition-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the charge item definition is intended to be in use',
        code: 'effective',
        base: ['ChargeItemDefinition'],
        type: 'date',
        expression: 'ChargeItemDefinition.effectivePeriod',
        xpath: 'f:ChargeItemDefinition/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Citation-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Citation-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Citation-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The citation publication date',
        code: 'date',
        base: ['Citation'],
        type: 'date',
        expression: 'Citation.date',
        xpath: 'f:Citation/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Citation-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Citation-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Citation-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the citation is intended to be in use',
        code: 'effective',
        base: ['Citation'],
        type: 'date',
        expression: 'Citation.effectivePeriod',
        xpath: 'f:Citation/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Claim-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Claim-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Claim-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The creation date for the Claim',
        code: 'created',
        base: ['Claim'],
        type: 'date',
        expression: 'Claim.created',
        xpath: 'f:Claim/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ClaimResponse-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ClaimResponse-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ClaimResponse-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The creation date',
        code: 'created',
        base: ['ClaimResponse'],
        type: 'date',
        expression: 'ClaimResponse.created',
        xpath: 'f:ClaimResponse/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ClaimResponse-payment-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ClaimResponse-payment-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ClaimResponse-payment-date',
        version: '4.3.0',
        name: 'payment-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The expected payment date',
        code: 'payment-date',
        base: ['ClaimResponse'],
        type: 'date',
        expression: 'ClaimResponse.payment.date',
        xpath: 'f:ClaimResponse/f:payment/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Communication-received',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Communication-received',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Communication-received',
        version: '4.3.0',
        name: 'received',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'When received',
        code: 'received',
        base: ['Communication'],
        type: 'date',
        expression: 'Communication.received',
        xpath: 'f:Communication/f:received',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Communication-sent',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Communication-sent',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Communication-sent',
        version: '4.3.0',
        name: 'sent',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'When sent',
        code: 'sent',
        base: ['Communication'],
        type: 'date',
        expression: 'Communication.sent',
        xpath: 'f:Communication/f:sent',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/CommunicationRequest-authored',
      resource: {
        resourceType: 'SearchParameter',
        id: 'CommunicationRequest-authored',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/CommunicationRequest-authored',
        version: '4.3.0',
        name: 'authored',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'When request transitioned to being actionable',
        code: 'authored',
        base: ['CommunicationRequest'],
        type: 'date',
        expression: 'CommunicationRequest.authoredOn',
        xpath: 'f:CommunicationRequest/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/CommunicationRequest-occurrence',
      resource: {
        resourceType: 'SearchParameter',
        id: 'CommunicationRequest-occurrence',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/CommunicationRequest-occurrence',
        version: '4.3.0',
        name: 'occurrence',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'When scheduled',
        code: 'occurrence',
        base: ['CommunicationRequest'],
        type: 'date',
        expression: '(CommunicationRequest.occurrence as dateTime)',
        xpath: 'f:CommunicationRequest/f:occurrenceDateTime',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Composition-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Composition-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Composition-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Structured Documents)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/structure/index.cfm'
              }
            ]
          }
        ],
        description: 'The period covered by the documentation',
        code: 'period',
        base: ['Composition'],
        type: 'date',
        expression: 'Composition.event.period',
        xpath: 'f:Composition/f:event/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Condition-abatement-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Condition-abatement-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Condition-abatement-date',
        version: '4.3.0',
        name: 'abatement-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Date-related abatements (dateTime and period)',
        code: 'abatement-date',
        base: ['Condition'],
        type: 'date',
        expression: 'Condition.abatement.as(dateTime) | Condition.abatement.as(Period)',
        xpath: 'f:Condition/f:abatementDateTime | f:Condition/f:abatementPeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Condition-onset-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Condition-onset-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Condition-onset-date',
        version: '4.3.0',
        name: 'onset-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Date related onsets (dateTime and Period)',
        code: 'onset-date',
        base: ['Condition'],
        type: 'date',
        expression: 'Condition.onset.as(dateTime) | Condition.onset.as(Period)',
        xpath: 'f:Condition/f:onsetDateTime | f:Condition/f:onsetPeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Condition-recorded-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Condition-recorded-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Condition-recorded-date',
        version: '4.3.0',
        name: 'recorded-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Date record was first recorded',
        code: 'recorded-date',
        base: ['Condition'],
        type: 'date',
        expression: 'Condition.recordedDate',
        xpath: 'f:Condition/f:recordedDate',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Consent-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Consent-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Consent-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Community Based Collaborative Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/homehealth/index.cfm'
              }
            ]
          }
        ],
        description: 'Timeframe for this rule',
        code: 'period',
        base: ['Consent'],
        type: 'date',
        expression: 'Consent.provision.period',
        xpath: 'f:Consent/f:provision/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Contract-issued',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Contract-issued',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Contract-issued',
        version: '4.3.0',
        name: 'issued',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The date/time the contract was issued',
        code: 'issued',
        base: ['Contract'],
        type: 'date',
        expression: 'Contract.issued',
        xpath: 'f:Contract/f:issued',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/CoverageEligibilityRequest-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'CoverageEligibilityRequest-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/CoverageEligibilityRequest-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The creation date for the EOB',
        code: 'created',
        base: ['CoverageEligibilityRequest'],
        type: 'date',
        expression: 'CoverageEligibilityRequest.created',
        xpath: 'f:CoverageEligibilityRequest/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/CoverageEligibilityResponse-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'CoverageEligibilityResponse-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/CoverageEligibilityResponse-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The creation date',
        code: 'created',
        base: ['CoverageEligibilityResponse'],
        type: 'date',
        expression: 'CoverageEligibilityResponse.created',
        xpath: 'f:CoverageEligibilityResponse/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DetectedIssue-identified',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DetectedIssue-identified',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DetectedIssue-identified',
        version: '4.3.0',
        name: 'identified',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'When identified',
        code: 'identified',
        base: ['DetectedIssue'],
        type: 'date',
        expression: 'DetectedIssue.identified',
        xpath: 'f:DetectedIssue/f:identifiedDateTime | f:DetectedIssue/f:identifiedPeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DeviceRequest-authored-on',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DeviceRequest-authored-on',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DeviceRequest-authored-on',
        version: '4.3.0',
        name: 'authored-on',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'When the request transitioned to being actionable',
        code: 'authored-on',
        base: ['DeviceRequest'],
        type: 'date',
        expression: 'DeviceRequest.authoredOn',
        xpath: 'f:DeviceRequest/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DeviceRequest-event-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DeviceRequest-event-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DeviceRequest-event-date',
        version: '4.3.0',
        name: 'event-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'When service should occur',
        code: 'event-date',
        base: ['DeviceRequest'],
        type: 'date',
        expression: '(DeviceRequest.occurrence as dateTime) | (DeviceRequest.occurrence as Period)',
        xpath: 'f:DeviceRequest/f:occurrenceDateTime | f:DeviceRequest/f:occurrencePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DiagnosticReport-issued',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DiagnosticReport-issued',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DiagnosticReport-issued',
        version: '4.3.0',
        name: 'issued',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'When the report was issued',
        code: 'issued',
        base: ['DiagnosticReport'],
        type: 'date',
        expression: 'DiagnosticReport.issued',
        xpath: 'f:DiagnosticReport/f:issued',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DocumentManifest-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DocumentManifest-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DocumentManifest-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Structured Documents)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/structure/index.cfm'
              }
            ]
          }
        ],
        description: 'When this document manifest created',
        code: 'created',
        base: ['DocumentManifest'],
        type: 'date',
        expression: 'DocumentManifest.created',
        xpath: 'f:DocumentManifest/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DocumentReference-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DocumentReference-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DocumentReference-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Structured Documents)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/structure/index.cfm'
              }
            ]
          }
        ],
        description: 'When this document reference was created',
        code: 'date',
        base: ['DocumentReference'],
        type: 'date',
        expression: 'DocumentReference.date',
        xpath: 'f:DocumentReference/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/DocumentReference-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'DocumentReference-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/DocumentReference-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Structured Documents)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/structure/index.cfm'
              }
            ]
          }
        ],
        description: 'Time of service that is being documented',
        code: 'period',
        base: ['DocumentReference'],
        type: 'date',
        expression: 'DocumentReference.context.period',
        xpath: 'f:DocumentReference/f:context/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Encounter-location-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Encounter-location-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Encounter-location-period',
        version: '4.3.0',
        name: 'location-period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'Time period during which the patient was present at the location',
        code: 'location-period',
        base: ['Encounter'],
        type: 'date',
        expression: 'Encounter.location.period',
        xpath: 'f:Encounter/f:location/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/EventDefinition-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'EventDefinition-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/EventDefinition-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The event definition publication date',
        code: 'date',
        base: ['EventDefinition'],
        type: 'date',
        expression: 'EventDefinition.date',
        xpath: 'f:EventDefinition/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/EventDefinition-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'EventDefinition-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/EventDefinition-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the event definition is intended to be in use',
        code: 'effective',
        base: ['EventDefinition'],
        type: 'date',
        expression: 'EventDefinition.effectivePeriod',
        xpath: 'f:EventDefinition/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Evidence-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Evidence-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Evidence-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The evidence publication date',
        code: 'date',
        base: ['Evidence'],
        type: 'date',
        expression: 'Evidence.date',
        xpath: 'f:Evidence/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/EvidenceVariable-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'EvidenceVariable-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/EvidenceVariable-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The evidence variable publication date',
        code: 'date',
        base: ['EvidenceVariable'],
        type: 'date',
        expression: 'EvidenceVariable.date',
        xpath: 'f:EvidenceVariable/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ExampleScenario-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ExampleScenario-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ExampleScenario-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'The example scenario publication date',
        code: 'date',
        base: ['ExampleScenario'],
        type: 'date',
        expression: 'ExampleScenario.date',
        xpath: 'f:ExampleScenario/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ExplanationOfBenefit-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ExplanationOfBenefit-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ExplanationOfBenefit-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The creation date for the EOB',
        code: 'created',
        base: ['ExplanationOfBenefit'],
        type: 'date',
        expression: 'ExplanationOfBenefit.created',
        xpath: 'f:ExplanationOfBenefit/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Goal-start-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Goal-start-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Goal-start-date',
        version: '4.3.0',
        name: 'start-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'When goal pursuit begins',
        code: 'start-date',
        base: ['Goal'],
        type: 'date',
        expression: '(Goal.start as date)',
        xpath: 'f:Goal/f:startDate',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Goal-target-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Goal-target-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Goal-target-date',
        version: '4.3.0',
        name: 'target-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Care)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/patientcare/index.cfm'
              }
            ]
          }
        ],
        description: 'Reach goal on or before',
        code: 'target-date',
        base: ['Goal'],
        type: 'date',
        expression: '(Goal.target.due as date)',
        xpath: 'f:Goal/f:target/f:dueDate',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ImagingStudy-started',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ImagingStudy-started',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ImagingStudy-started',
        version: '4.3.0',
        name: 'started',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Imaging Integration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/imagemgt/index.cfm'
              }
            ]
          }
        ],
        description: 'When the study was started',
        code: 'started',
        base: ['ImagingStudy'],
        type: 'date',
        expression: 'ImagingStudy.started',
        xpath: 'f:ImagingStudy/f:started',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Immunization-reaction-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Immunization-reaction-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Immunization-reaction-date',
        version: '4.3.0',
        name: 'reaction-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Public Health and Emergency Response)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pher/index.cfm'
              }
            ]
          }
        ],
        description: 'When reaction started',
        code: 'reaction-date',
        base: ['Immunization'],
        type: 'date',
        expression: 'Immunization.reaction.date',
        xpath: 'f:Immunization/f:reaction/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ImmunizationEvaluation-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ImmunizationEvaluation-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ImmunizationEvaluation-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Public Health and Emergency Response)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pher/index.cfm'
              }
            ]
          }
        ],
        description: 'Date the evaluation was generated',
        code: 'date',
        base: ['ImmunizationEvaluation'],
        type: 'date',
        expression: 'ImmunizationEvaluation.date',
        xpath: 'f:ImmunizationEvaluation/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ImmunizationRecommendation-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ImmunizationRecommendation-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ImmunizationRecommendation-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Public Health and Emergency Response)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pher/index.cfm'
              }
            ]
          }
        ],
        description: 'Date recommendation(s) created',
        code: 'date',
        base: ['ImmunizationRecommendation'],
        type: 'date',
        expression: 'ImmunizationRecommendation.date',
        xpath: 'f:ImmunizationRecommendation/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Invoice-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Invoice-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Invoice-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'Invoice date / posting date',
        code: 'date',
        base: ['Invoice'],
        type: 'date',
        expression: 'Invoice.date',
        xpath: 'f:Invoice/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Library-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Library-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Library-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The library publication date',
        code: 'date',
        base: ['Library'],
        type: 'date',
        expression: 'Library.date',
        xpath: 'f:Library/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Library-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Library-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Library-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the library is intended to be in use',
        code: 'effective',
        base: ['Library'],
        type: 'date',
        expression: 'Library.effectivePeriod',
        xpath: 'f:Library/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Measure-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Measure-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Measure-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Quality Information)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/cqi/index.cfm'
              }
            ]
          }
        ],
        description: 'The measure publication date',
        code: 'date',
        base: ['Measure'],
        type: 'date',
        expression: 'Measure.date',
        xpath: 'f:Measure/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Measure-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Measure-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Measure-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Quality Information)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/cqi/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the measure is intended to be in use',
        code: 'effective',
        base: ['Measure'],
        type: 'date',
        expression: 'Measure.effectivePeriod',
        xpath: 'f:Measure/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MeasureReport-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MeasureReport-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MeasureReport-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Quality Information)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/cqi/index.cfm'
              }
            ]
          }
        ],
        description: 'The date of the measure report',
        code: 'date',
        base: ['MeasureReport'],
        type: 'date',
        expression: 'MeasureReport.date',
        xpath: 'f:MeasureReport/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MeasureReport-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MeasureReport-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MeasureReport-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Quality Information)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/cqi/index.cfm'
              }
            ]
          }
        ],
        description: 'The period of the measure report',
        code: 'period',
        base: ['MeasureReport'],
        type: 'date',
        expression: 'MeasureReport.period',
        xpath: 'f:MeasureReport/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Media-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Media-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Media-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'When Media was collected',
        code: 'created',
        base: ['Media'],
        type: 'date',
        expression: 'Media.created',
        xpath: 'f:Media/f:createdDateTime | f:Media/f:createdPeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Medication-expiration-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Medication-expiration-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Medication-expiration-date',
        version: '4.3.0',
        name: 'expiration-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description: 'Returns medications in a batch with this expiration date',
        code: 'expiration-date',
        base: ['Medication'],
        type: 'date',
        expression: 'Medication.batch.expirationDate',
        xpath: 'f:Medication/f:batch/f:expirationDate',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MedicationAdministration-effective-time',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MedicationAdministration-effective-time',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MedicationAdministration-effective-time',
        version: '4.3.0',
        name: 'effective-time',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description: 'Date administration happened (or did not happen)',
        code: 'effective-time',
        base: ['MedicationAdministration'],
        type: 'date',
        expression: 'MedicationAdministration.effective',
        xpath: 'f:MedicationAdministration/f:effectiveDateTime | f:MedicationAdministration/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MedicationDispense-whenhandedover',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MedicationDispense-whenhandedover',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MedicationDispense-whenhandedover',
        version: '4.3.0',
        name: 'whenhandedover',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description: 'Returns dispenses handed over on this date',
        code: 'whenhandedover',
        base: ['MedicationDispense'],
        type: 'date',
        expression: 'MedicationDispense.whenHandedOver',
        xpath: 'f:MedicationDispense/f:whenHandedOver',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MedicationDispense-whenprepared',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MedicationDispense-whenprepared',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MedicationDispense-whenprepared',
        version: '4.3.0',
        name: 'whenprepared',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description: 'Returns dispenses prepared on this date',
        code: 'whenprepared',
        base: ['MedicationDispense'],
        type: 'date',
        expression: 'MedicationDispense.whenPrepared',
        xpath: 'f:MedicationDispense/f:whenPrepared',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MedicationRequest-authoredon',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MedicationRequest-authoredon',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MedicationRequest-authoredon',
        version: '4.3.0',
        name: 'authoredon',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description: 'Return prescriptions written on this date',
        code: 'authoredon',
        base: ['MedicationRequest'],
        type: 'date',
        expression: 'MedicationRequest.authoredOn',
        xpath: 'f:MedicationRequest/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/medications-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'medications-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/medications-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description:
          'Multiple Resources: \r\n\r\n* [MedicationRequest](medicationrequest.html): Returns medication request to be administered on a specific date\r\n',
        code: 'date',
        base: ['MedicationRequest'],
        type: 'date',
        expression: 'MedicationRequest.dosageInstruction.timing.event',
        xpath: 'f:MedicationRequest/f:dosageInstruction/f:timing/f:event',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/MedicationStatement-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'MedicationStatement-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/MedicationStatement-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Pharmacy)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/medication/index.cfm'
              }
            ]
          }
        ],
        description: 'Date when patient was taking (or not taking) the medication',
        code: 'effective',
        base: ['MedicationStatement'],
        type: 'date',
        expression: 'MedicationStatement.effective',
        xpath: 'f:MedicationStatement/f:effectiveDateTime | f:MedicationStatement/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/NamingSystem-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'NamingSystem-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/NamingSystem-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Vocabulary)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/Vocab/index.cfm'
              }
            ]
          }
        ],
        description: 'When is identifier valid?',
        code: 'period',
        base: ['NamingSystem'],
        type: 'date',
        expression: 'NamingSystem.uniqueId.period',
        xpath: 'f:NamingSystem/f:uniqueId/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/NutritionOrder-datetime',
      resource: {
        resourceType: 'SearchParameter',
        id: 'NutritionOrder-datetime',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/NutritionOrder-datetime',
        version: '4.3.0',
        name: 'datetime',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'Return nutrition orders requested on this date',
        code: 'datetime',
        base: ['NutritionOrder'],
        type: 'date',
        expression: 'NutritionOrder.dateTime',
        xpath: 'f:NutritionOrder/f:dateTime',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Observation-value-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Observation-value-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Observation-value-date',
        version: '4.3.0',
        name: 'value-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'The value of the observation, if the value is a date or period of time',
        code: 'value-date',
        base: ['Observation'],
        type: 'date',
        expression: '(Observation.value as dateTime) | (Observation.value as Period)',
        xpath: 'f:Observation/f:valueDateTime | f:Observation/f:valuePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/OrganizationAffiliation-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'OrganizationAffiliation-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/OrganizationAffiliation-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description:
          'The period during which the participatingOrganization is affiliated with the primary organization',
        code: 'date',
        base: ['OrganizationAffiliation'],
        type: 'date',
        expression: 'OrganizationAffiliation.period',
        xpath: 'f:OrganizationAffiliation/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/individual-birthdate',
      resource: {
        resourceType: 'SearchParameter',
        id: 'individual-birthdate',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/individual-birthdate',
        version: '4.3.0',
        name: 'birthdate',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description:
          "Multiple Resources: \r\n\r\n* [Patient](patient.html): The patient's date of birth\r\n* [Person](person.html): The person's date of birth\r\n* [RelatedPerson](relatedperson.html): The Related Person's date of birth\r\n",
        code: 'birthdate',
        base: ['Patient', 'Person', 'RelatedPerson'],
        type: 'date',
        expression: 'Patient.birthDate | Person.birthDate | RelatedPerson.birthDate',
        xpath: 'f:Patient/f:birthDate | f:Person/f:birthDate | f:RelatedPerson/f:birthDate',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Patient-death-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Patient-death-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Patient-death-date',
        version: '4.3.0',
        name: 'death-date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'The date of death has been provided and satisfies this search value',
        code: 'death-date',
        base: ['Patient'],
        type: 'date',
        expression: '(Patient.deceased as dateTime)',
        xpath: 'f:Patient/f:deceasedDateTime',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/PaymentNotice-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'PaymentNotice-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/PaymentNotice-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'Creation date fro the notice',
        code: 'created',
        base: ['PaymentNotice'],
        type: 'date',
        expression: 'PaymentNotice.created',
        xpath: 'f:PaymentNotice/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/PaymentReconciliation-created',
      resource: {
        resourceType: 'SearchParameter',
        id: 'PaymentReconciliation-created',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/PaymentReconciliation-created',
        version: '4.3.0',
        name: 'created',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'The creation date',
        code: 'created',
        base: ['PaymentReconciliation'],
        type: 'date',
        expression: 'PaymentReconciliation.created',
        xpath: 'f:PaymentReconciliation/f:created',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/PlanDefinition-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'PlanDefinition-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/PlanDefinition-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The plan definition publication date',
        code: 'date',
        base: ['PlanDefinition'],
        type: 'date',
        expression: 'PlanDefinition.date',
        xpath: 'f:PlanDefinition/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/PlanDefinition-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'PlanDefinition-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/PlanDefinition-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the plan definition is intended to be in use',
        code: 'effective',
        base: ['PlanDefinition'],
        type: 'date',
        expression: 'PlanDefinition.effectivePeriod',
        xpath: 'f:PlanDefinition/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/PractitionerRole-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'PractitionerRole-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/PractitionerRole-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'The period during which the practitioner is authorized to perform in these role(s)',
        code: 'date',
        base: ['PractitionerRole'],
        type: 'date',
        expression: 'PractitionerRole.period',
        xpath: 'f:PractitionerRole/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Provenance-recorded',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Provenance-recorded',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Provenance-recorded',
        version: '4.3.0',
        name: 'recorded',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Security)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/secure/index.cfm'
              }
            ]
          }
        ],
        description: 'When the activity was recorded / updated',
        code: 'recorded',
        base: ['Provenance'],
        type: 'date',
        expression: 'Provenance.recorded',
        xpath: 'f:Provenance/f:recorded',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Provenance-when',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Provenance-when',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Provenance-when',
        version: '4.3.0',
        name: 'when',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Security)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/secure/index.cfm'
              }
            ]
          }
        ],
        description: 'When the activity occurred',
        code: 'when',
        base: ['Provenance'],
        type: 'date',
        expression: '(Provenance.occurred as dateTime)',
        xpath: 'f:Provenance/f:occurredDateTime',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Questionnaire-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Questionnaire-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Questionnaire-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'The questionnaire publication date',
        code: 'date',
        base: ['Questionnaire'],
        type: 'date',
        expression: 'Questionnaire.date',
        xpath: 'f:Questionnaire/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Questionnaire-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Questionnaire-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Questionnaire-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the questionnaire is intended to be in use',
        code: 'effective',
        base: ['Questionnaire'],
        type: 'date',
        expression: 'Questionnaire.effectivePeriod',
        xpath: 'f:Questionnaire/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/QuestionnaireResponse-authored',
      resource: {
        resourceType: 'SearchParameter',
        id: 'QuestionnaireResponse-authored',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/QuestionnaireResponse-authored',
        version: '4.3.0',
        name: 'authored',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'When the questionnaire response was last changed',
        code: 'authored',
        base: ['QuestionnaireResponse'],
        type: 'date',
        expression: 'QuestionnaireResponse.authored',
        xpath: 'f:QuestionnaireResponse/f:authored',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/RequestGroup-authored',
      resource: {
        resourceType: 'SearchParameter',
        id: 'RequestGroup-authored',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/RequestGroup-authored',
        version: '4.3.0',
        name: 'authored',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The date the request group was authored',
        code: 'authored',
        base: ['RequestGroup'],
        type: 'date',
        expression: 'RequestGroup.authoredOn',
        xpath: 'f:RequestGroup/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ResearchDefinition-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ResearchDefinition-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ResearchDefinition-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The research definition publication date',
        code: 'date',
        base: ['ResearchDefinition'],
        type: 'date',
        expression: 'ResearchDefinition.date',
        xpath: 'f:ResearchDefinition/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ResearchDefinition-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ResearchDefinition-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ResearchDefinition-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the research definition is intended to be in use',
        code: 'effective',
        base: ['ResearchDefinition'],
        type: 'date',
        expression: 'ResearchDefinition.effectivePeriod',
        xpath: 'f:ResearchDefinition/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ResearchElementDefinition-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ResearchElementDefinition-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ResearchElementDefinition-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The research element definition publication date',
        code: 'date',
        base: ['ResearchElementDefinition'],
        type: 'date',
        expression: 'ResearchElementDefinition.date',
        xpath: 'f:ResearchElementDefinition/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ResearchElementDefinition-effective',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ResearchElementDefinition-effective',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ResearchElementDefinition-effective',
        version: '4.3.0',
        name: 'effective',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Clinical Decision Support)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/dss/index.cfm'
              }
            ]
          }
        ],
        description: 'The time during which the research element definition is intended to be in use',
        code: 'effective',
        base: ['ResearchElementDefinition'],
        type: 'date',
        expression: 'ResearchElementDefinition.effectivePeriod',
        xpath: 'f:ResearchElementDefinition/f:effectivePeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ResearchStudy-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ResearchStudy-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ResearchStudy-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Biomedical Research and Regulation)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/rcrim/index.cfm'
              }
            ]
          }
        ],
        description: 'When the study began and ended',
        code: 'date',
        base: ['ResearchStudy'],
        type: 'date',
        expression: 'ResearchStudy.period',
        xpath: 'f:ResearchStudy/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ResearchSubject-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ResearchSubject-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ResearchSubject-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Biomedical Research and Regulation)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/rcrim/index.cfm'
              }
            ]
          }
        ],
        description: 'Start and end of participation',
        code: 'date',
        base: ['ResearchSubject'],
        type: 'date',
        expression: 'ResearchSubject.period',
        xpath: 'f:ResearchSubject/f:period',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Schedule-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Schedule-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Schedule-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'Search for Schedule resources that have a period that contains this date specified',
        code: 'date',
        base: ['Schedule'],
        type: 'date',
        expression: 'Schedule.planningHorizon',
        xpath: 'f:Schedule/f:planningHorizon',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ServiceRequest-authored',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ServiceRequest-authored',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ServiceRequest-authored',
        version: '4.3.0',
        name: 'authored',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'Date request signed',
        code: 'authored',
        base: ['ServiceRequest'],
        type: 'date',
        expression: 'ServiceRequest.authoredOn',
        xpath: 'f:ServiceRequest/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/ServiceRequest-occurrence',
      resource: {
        resourceType: 'SearchParameter',
        id: 'ServiceRequest-occurrence',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/ServiceRequest-occurrence',
        version: '4.3.0',
        name: 'occurrence',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'When service should occur',
        code: 'occurrence',
        base: ['ServiceRequest'],
        type: 'date',
        expression: 'ServiceRequest.occurrence',
        xpath:
          'f:ServiceRequest/f:occurrenceDateTime | f:ServiceRequest/f:occurrencePeriod | f:ServiceRequest/f:occurrenceTiming',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Slot-start',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Slot-start',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Slot-start',
        version: '4.3.0',
        name: 'start',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Patient Administration)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/pafm/index.cfm'
              }
            ]
          }
        ],
        description: 'Appointment date/time.',
        code: 'start',
        base: ['Slot'],
        type: 'date',
        expression: 'Slot.start',
        xpath: 'f:Slot/f:start',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Specimen-collected',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Specimen-collected',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Specimen-collected',
        version: '4.3.0',
        name: 'collected',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'The date the specimen was collected',
        code: 'collected',
        base: ['Specimen'],
        type: 'date',
        expression: 'Specimen.collection.collected',
        xpath: 'f:Specimen/f:collection/f:collectedDateTime | f:Specimen/f:collection/f:collectedPeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/SubscriptionTopic-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'SubscriptionTopic-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/SubscriptionTopic-date',
        version: '4.3.0',
        name: 'date',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'Date status first applied',
        code: 'date',
        base: ['SubscriptionTopic'],
        type: 'date',
        expression: 'SubscriptionTopic.date',
        xpath: 'f:SubscriptionTopic/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Substance-expiry',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Substance-expiry',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'normative'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Substance-expiry',
        version: '4.3.0',
        name: 'expiry',
        status: 'active',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'Expiry date of package or container of substance',
        code: 'expiry',
        base: ['Substance'],
        type: 'date',
        expression: 'Substance.instance.expiry',
        xpath: 'f:Substance/f:instance/f:expiry',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Task-authored-on',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Task-authored-on',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Task-authored-on',
        version: '4.3.0',
        name: 'authored-on',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'Search by creation date',
        code: 'authored-on',
        base: ['Task'],
        type: 'date',
        expression: 'Task.authoredOn',
        xpath: 'f:Task/f:authoredOn',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Task-modified',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Task-modified',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Task-modified',
        version: '4.3.0',
        name: 'modified',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'Search by last modification date',
        code: 'modified',
        base: ['Task'],
        type: 'date',
        expression: 'Task.lastModified',
        xpath: 'f:Task/f:lastModified',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/Task-period',
      resource: {
        resourceType: 'SearchParameter',
        id: 'Task-period',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/Task-period',
        version: '4.3.0',
        name: 'period',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Orders and Observations)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/orders/index.cfm'
              }
            ]
          }
        ],
        description: 'Search by period Task is/was underway',
        code: 'period',
        base: ['Task'],
        type: 'date',
        expression: 'Task.executionPeriod',
        xpath: 'f:Task/f:executionPeriod',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/TestReport-issued',
      resource: {
        resourceType: 'SearchParameter',
        id: 'TestReport-issued',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/TestReport-issued',
        version: '4.3.0',
        name: 'issued',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'The test report generation date',
        code: 'issued',
        base: ['TestReport'],
        type: 'date',
        expression: 'TestReport.issued',
        xpath: 'f:TestReport/f:issued',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/TestScript-date',
      resource: {
        resourceType: 'SearchParameter',
        id: 'TestScript-date',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/TestScript-date',
        version: '4.3.0',
        name: 'date',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (FHIR Infrastructure)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fiwg/index.cfm'
              }
            ]
          }
        ],
        description: 'The test script publication date',
        code: 'date',
        base: ['TestScript'],
        type: 'date',
        expression: 'TestScript.date',
        xpath: 'f:TestScript/f:date',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    },
    {
      fullUrl: 'http://hl7.org/fhir/SearchParameter/VisionPrescription-datewritten',
      resource: {
        resourceType: 'SearchParameter',
        id: 'VisionPrescription-datewritten',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
            valueCode: 'trial-use'
          }
        ],
        url: 'http://hl7.org/fhir/SearchParameter/VisionPrescription-datewritten',
        version: '4.3.0',
        name: 'datewritten',
        status: 'draft',
        experimental: false,
        date: '2022-05-28T12:47:40+10:00',
        publisher: 'Health Level Seven International (Financial Management)',
        contact: [
          {
            telecom: [
              {
                system: 'url',
                value: 'http://hl7.org/fhir'
              }
            ]
          },
          {
            telecom: [
              {
                system: 'url',
                value: 'http://www.hl7.org/Special/committees/fm/index.cfm'
              }
            ]
          }
        ],
        description: 'Return prescriptions written on this date',
        code: 'datewritten',
        base: ['VisionPrescription'],
        type: 'date',
        expression: 'VisionPrescription.dateWritten',
        xpath: 'f:VisionPrescription/f:dateWritten',
        xpathUsage: 'normal',
        comparator: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'sa', 'eb', 'ap']
      }
    }
  ]
};
