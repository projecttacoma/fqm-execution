# Governance

## Issue Reporting

Issues should be reported in accordance with the [contribution guidelines](contributing.md).

## Issue Review

Reported issues are reviewed as quickly as possible.  After review, a response will be made indicating potential or planned next steps.  Such next steps may include asking for additional information or indicating a bug was discovered.

If an update is required to a dependency project, then the `fqm-execution` team will indicate which dependency update is required and may assist that team in the resolution. 

## Releases

An agile methodology using 2-week sprints is used for `fqm-execution`.  If a change is required to `fqm-execution` to resolve an issue, then the issue will be assigned as a task in sprint planning for development work.  This will lead to inclusion in a future release of `fqm-execution`.

Issue resolutions are made in pull requests to `fqm-execution`.  Observers are invited to review pull requests for comment or testing.

New releases are generally scheduled for the Wednesday at the end of a sprint.  Releases, such as urgent hotfix releases, may be made out-of-cycle at the `fqm-execution` team's discretion.  In all cases, a release will include information on issues resolved.

## Closing an Issue

Issues are closed upon resolution or inactivity.  This includes the following:
- An issue may require only information.  In this case, the issue will be closed after the information is provided.
- An issue may require an update to `fqm-execution`.  In this case, the issue will be closed after a pull request has been accepted resolving the issue.  The next release of `fqm-execution` will include the update.
- An issue may be filed with no follow up activity from the submitter (e.g. more information is required, but not provided).  In this case, the issue will be closed and a new issue will need to be filed to revisit if necessary.

# Dependency Linking

This project relies on a number of dependencies, and issues reported here may have a root cause based in one of these dependencies.  When this is the case, the original submitter or the `fqm-execution` team may create an issue for that dependency following the issue reporting guidelines of that dependency project.  

When an issue is filed with a dependency project, the following steps should be completed to allow observers to track updates:

- In the dependency project, a link to the original `fqm-execution` issue should be included with the issue description. 
- In the `fqm-execution` issue, a post should be added noting that a root cause was identified and a tracker created in the dependency project for the root cause.  A link should be included to the issue created in the dependency project.

As `fqm-execution` calculates CQL measures, the following two dependencies may be of interest for tracking independently: 

- [cql-execution](https://github.com/cqframework/cql-execution):  Provides the underlying CQL execution capabilities provided in this project.

- [CQL-to-ELM Translator](https://github.com/cqframework/clinical_quality_language/blob/master/Src/java/cql-to-elm/OVERVIEW.md):  Often used to generate ELM, which fqm-execution can execute, from CQL.

## Projects using fqm-execution

It is encouraged that other projects follow the dependency linking guidance above within their own issue tracking so that observers may follow the resolution of issues across projects including `fqm-execution`.

# License

Copyright 2020-2023 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
