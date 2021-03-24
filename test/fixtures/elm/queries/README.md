## Prerequisites

* `node` version `12.x` or greater, with `ts-node` installed globally
    * `npm install -g ts-node`
* `Docker`

## Use

To use the `Makefile` provided in this directory to translate CQL into ELM JSON:

* Navigate to the `test/fixtures/elm/queries` directory in the command line
* Put your CQL in a file (or multiple files) in the `queries` directory, with the `.cql` extension
* run `make` in this directory. `make` will:
    * Start the translation service in Docker (if not already started)
    * Translate all files in the `queries` directory into ELM JSON
    * Place the translated JSON files into `output/`

If the translation service returns any errors from translation, the parser will output errors for the first file it comes to with errors. That file, and any after it, will not be written to `output/`

The translation service is called with `EnableAnnotations` and `EnableLocators` set, through URL query parameters.

## Cleanup

To stop the translation service, run `make clean`. This will not delete any translated JSON in `output/`.
