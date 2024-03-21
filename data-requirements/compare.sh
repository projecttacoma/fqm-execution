#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

VERBOSE=false

function usage() {
    cat <<USAGE

    Usage: $0 [-v|--verbose]

    Options:
        -v/--verbose:           Use verbose comparison. Will print out diffs of failing JSON files with spacing (default: false)
USAGE
    exit 1
}

while test $# != 0
do
    case "$1" in 
    -v | --verbose) VERBOSE=true;;
    esac
    shift
done

echo "Gathering data-requirements output from the fhir_review branch of elm-parser-for-ecqms"

# Clone the elm-parser-for-ecqms in the data-requirements directory if it hasn't been, swtich to the fhir_review branch,
# run parse_elm.rb with --bundle qicore to get data-requirements for measure bundles from the January 2024 Connectathon
if [ ! -d "elm-parser-for-ecqms" ]; then
    git clone https://github.com/projecttacoma/elm-parser-for-ecqms.git
    git fetch --all
    cd elm-parser-for-ecqms
    git checkout "fhir_review"
    ruby parse_elm.rb --bundle qicore
    cd ..
    if [ -d "elm-parser-dr" ]; then
        rm -rf elm-parser-dr/*.json
    fi
    mkdir elm-parser-dr
    SOURCE_DIR="elm-parser-for-ecqms/data_requirements/library"
    TARGET_DIR="elm-parser-dr"

    # Move all files from source to target directory
    mv "$SOURCE_DIR"/* "$TARGET_DIR"
fi

echo "Gathering data-requirements output from fqm-execution using the measure bundles from the January 2024 Connectathon"

npx ts-node fqm-e-dr.ts

for file in "fqm-e-dr"/*; do
    BASE_PATH="$(basename "$file")"
    BASE_NAME=${BASE_PATH%"-dr.json"*}

    FQM_E_DR=$file
    ELM_PARSER_DR="elm-parser-dr/${BASE_NAME}.xml.json"

    if ! test -f "$FQM_E_DR"; then
        echo -e "${RED}FAIL${NC}: $FQM_E_DR does not exist"
    fi

    if ! test -f "$ELM_PARSER_DR"; then
        echo -e "${RED}FAIL${NC}: $ELM_PARSER_DR does not exist"
    fi

    if cmp --silent $FQM_E_DR $ELM_PARSER_DR; then  
        echo -e "${GREEN}PASS${NC}: $BASE_NAME"
    else 
        echo -e "${RED}FAIL${NC}: $FQM_E_DR and $ELM_PARSER_DR are different"

        if [ $VERBOSE = "true" ]; then
            diff $FQM_E_DR $ELM_PARSER_DR
        fi
    fi
done

echo "Finished"