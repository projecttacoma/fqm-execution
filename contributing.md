# Guidelines

## Issue Reports

Any issues or suggestions to improve `fqm-execution` can be reported through a [GitHub issue](https://github.com/projecttacoma/fqm-execution/issues/new?assignees=&labels=&template=general-issue-template.md&title=). Filling out the issue template as completely as possible
helps us replicate and track down the sources of issues faster

## Pull Requests

We will gladly accept pull requests to help improve `fqm-execution`. When submitting a pull request, please follow the auto-populated [pull request template](https://github.com/projecttacoma/fqm-execution/blob/master/.github/pull_request_template.md), describing the following:

- The goal/purpose of the pull request
  - If the pull request resolves a [GitHub issue](https://github.com/projecttacoma/fqm-execution/issues), link the issue using the `"Fixes #___"` shorthand in the summary,
    which will automatically link issue `___` to the pull request
- What runtime behavior has changed in the library as a result of the pull request, if any
- Relevant high-level code changes required for the pull request
- Instructions for the reviewer on how to test the pull request and verify the expected behavior

# Development Environment

## Prerequisites

- Any code editor that has TypeScript language support. [VS Code](https://code.visualstudio.com/) is most popular
- [Node.js >=16.0.0](https://nodejs.org/en/) is supported, LTS (`>=18.0.0`) is recommended
- [Git](https://git-scm.com/)

## Setup

Clone the source code:

```bash
git clone https://github.com/projecttacoma/fqm-execution.git
```

Install dependencies:

```bash
cd fqm-execution
npm install
```

# Using the CLI

The easiest way to test new code in `fqm-execution` is to use the built-in command line interface (CLI). This CLI can interface with all of the [calculation capabilities](/?id=calculator-functions) of `fqm-execution` and produce results that can be inspected/tested.

Run the CLI with the built-in `package.json` script:

```bash
npm run cli -- [command] [options]
```

Or using the built JavaScript:

```bash
npm run build
node build/cli.js [command] [options]
```

Optionally, you can install the `ts-node` utility globally to execute the TypeScript files directly instead of running the build script:

```bash
npm install -g ts-node
ts-node src/cli.ts [command] [options]
```

For a full list of available options and commands, see the [CLI section of the main documentation](/?id=cli)

The CLI comes built with a debug option (`-d/--debug`) which will include a `debugOutput` property on the results object containing any CQL, ELM, ValueSets, and engine results processed during execution. These files will also be written to a `./debug` directory when this flag is provided,
which is useful for inspecting contents of ELM, CQL, or results.

# Creating Measure Bundles for Specific Cases

Most commonly, development on `fqm-execution` will involve pre-existing measure bundles provided via a content repository or some other means (e.g. attached to a GitHub issue report). However, in some cases it may be useful to create a smaller "stripped down" version of a measure bundle
that makes it easier to debug potential issues.

To create your own measure bundle to use during development, consider using the [ecqm-bundler command line utility](https://github.com/mgramigna/ecqm-bundler) to easily generate valid measure bundles that `fqm-execution` will accept as input. Alongside this, you can also use our [publicly deployed instance](https://projecttacoma.github.io/fqm-testify/) of [fqm-testify](https://github.com/projecttacoma/fqm-testify)
to create simple patients that you can run through `fqm-execution` as well.

# Debugging

## Common Issues

In general, runtime errors that come directly from `fqm-execution` are quite rare. Most unhandled errors come from dependent libraries, i.e. [cql-execution](https://github.com/cqframework/cql-execution) or [cql-exec-fhir](https://github.com/cqframework/cql-exec-fhir)

### `x.someFunction` is Not a Function

Error throws with this message commonly come from `cql-execution`. The most common cause for this kind of error is a mismatch in data types for either the ELM expressions or the patient data itself (e.g. trying to do a `union` on arguments that are not list-like). The recommended approach for debugging this kind of issue is:

1. Try to isolate the ELM library and expression where the issue comes from
2. Visually inspect the content of the ELM JSON for this library, and ensure that the operands for the function being called are the correct data types (e.g. see if it is should be wrapped in a `FHIRHelpers.To___` function call)
3. Ensure that the FHIR data present in the patient `Bundle` are valid according to the FHIR specification

If the above conditions do not lead to an identified cause, it might be worth raising an issue in the [cql-execution](https://github.com/cqframework/cql-execution) repository. To verify that the issue indeed comes from `cql-execution`, consider using the [execution extractor command line utility](https://github.com/mgramigna/execution-extractor) to extract all of the ELM content, ValueSets , etc. and run it through `cql-execution` directly without needing to go through `fqm-execution`. If the error still persists, then the issue lies outside `fqm-execution`, and it either a problem with the input or with `cql-execution` itself.

### Unexpected Population Results

In some cases, `fqm-execution` will succeed in its calculation, but the data returned may yield some unexpected calculation results. The most common situations where this kind of issue arises is calculating complex measures, such as ratio measures with multiple observations or initial populations. The recommended approach for debugging these kinds of issues is:

1. Inspect the highlighted measure logic and identify the unexpected clauses that are being highlighted as red
2. Inspect the relevant portions of patient data, and ensure that the data is correct relative to the measurement period that is being used for calculation
3. Inspect the raw results coming back from `cql-execution` using the CLI `raw` command or the `.calculateRaw` API function and ensure that the proper raw data is being returned for each expression

If everything from steps 1-3 seems correct, there may be an issue with the population processing logic in `fqm-execution`. In this case, please feel free to submit an issue or a pull request.

## VS Code Debugger Setup

To attach a debugger to the TypeScript files for deeper inspection of the tool's functionality, we recommend using the VS Code's built in debugging adapter to be able to provide easy debugger configuration.

Add the following contents to `.vscode/launch.json` in the root of the project directory:

```javascript
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
              "<node_internals>/**"
            ],
            "preLaunchTask": "npm: build",
            "program": "${workspaceFolder}/src/cli.ts",
            "outFiles": [
              "${workspaceFolder}/build/**/*.js"
            ],
            "internalConsoleOptions": "openOnSessionStart",
            "args": ["<reports | detailed | raw | gaps | dataRequirements | queryInfo | valueSets>", "-m", "${workspaceFolder}/relative/path/to/measure/bundle.json", "-p", "${workspaceFolder}/relative/path/to/patient/bundle.json", "-o"]
          }
    ]
}
```

This will allow you to run the CLI from the `Run` tab in VS Code, and will halt execution of the program at any breakpoints or `debugger` statements in the code, to allow for debugging of the functionality.

**NOTE**: The `dataRequirements`, `libraryDataRequirements`, `queryInfo`, and `valueSets` commands do not require patient bundle(s) to be specified in the `args` array

# Testing

We use [Jest](https://jestjs.io/en/) for unit-testing `fqm-execution`. Tests can be running using the `test` script in package.json:

```bash
npm test
```

For integration testing, see [the integration testing README](https://github.com/projecttacoma/fqm-execution/blob/master/test/integration/README.md) for more information. The integration tests can be run with the following command:

```bash
npm run test:integration
```

When contributing new code, ensure that all tests, lint, and prettier checks pass with the following command:

```bash
npm run check
```

# License

Copyright 2020-2023 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
