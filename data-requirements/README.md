# fqm-execution Data Requirements Output Testing/Comparison

This directory includes scripts for comparing the data-requirements output of [fqm-execution](https://github.com/projecttacoma/fqm-execution) to the data-requirements output of the fhir_review branch of the [elm-parser-for-ecqms](https://github.com/projecttacoma/elm-parser-for-ecqms/tree/fhir_review).

## Getting Data Requirements from the elm-parser-for-ecqms

The scripts in this directory will get the data requirements output from the elm-parser-for-ecqms fhir_review branch for the January 2024 Connectathon bundles. On the fhir_review branch of elm-parser-for-ecqms, data-requirements are calculated for the measures in [elm-parser-for-ecqms/measures/qicore/measures](https://github.com/projecttacoma/elm-parser-for-ecqms/tree/fhir_review/measures/qicore/measures) by running the command `ruby parse_elm.rb --bundle qicore`. The results are outputted to JSON files per measure to `elm-parser-for-ecqms/data_requirements/library`. This is all done by the script and the results are moved to the `elm-parser-dr` directory.

## Getting Data Requirements from fqm-execution

The scripts in this directory will get the data requirements output from fqm-execution for the January 2024 Connectathon bundles. The data requirements are calculated with fqm-execution on every run for ease of testing changes to fqm-execution. Since the January 2024 Connectathon bundles are not in a GitHub repository, they will have to be manually dropped into the `jan-2024-connectathon` directory that is empty. The data requirements JSON output files will be moved to the `fqm-e-dr` directory after calculation.

## Comparing Data Requirements

Right now there are two ways to compare data-requirements. `compare.sh` takes a similar approach to the regression tests: data-requirements are calculated using fqm-execution and then using elm-parser-for-ecqms and their outputs are compared. This will likely not be useful with the current state of fqm-execution's data-requirements calculation as it is very different from the elm-parser-for-ecqms, but it may be in the future.

`summary-compare.sh` also compares the data-requirements outputs from fqm-execution and elm-parser-for-ecqms, but in a way that parses through each of the data-requirements in the data-requirements array. This script may be more useful to look at how many data-requirements of each type are being outputted by either repository and if they match up. By default, this script compares the data requirements outputs of all of the measures, however using the -m|--measure flag, one can specify a single measure to compare.

## Running the Scripts

Before running any of the scripts, be sure to populate the `jan-2024-connectathon` directory with the corresponding measure bundles.

To run `compare.sh`:

```
./compare.sh
```

To run `summary-compare.sh` for all measures:

```
./summary-compare.sh
```

To run `summary-compare.sh` for one measure (example: CMS996):

```
./summary-compare.sh -m CMS996
```

## Summary Compare Output

Right now, the `summary-compare.sh` script compares three things: the types of data requirements in either output, the data requirements of each type in either output, and the mustSupports of each data requirement in either output.

The summary output is currently structured in the following format:

```
-----Data Requirements Comparison for <CMS measure>-----
[PASS/DIFF]: Whether or not either of the outputs has data requirements of a type that the other does not

[PASS/FAIL (Data Requirement Type)]: Whether or not the data requirements of each output match my codeFilter.valueSet and provides details if they do not
MUST SUPPORTS
[MUST SUPPORTS PASS/FAIL(Data Requirement Type-ValueSet)]: Whether or not the mustSupports of the data requirements of each output match
```
