#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

VERBOSE=false

# Potentailly add data-requirement type option to just look at one type ?
# Also maybe include a verbose option ?
function usage() {
    cat <<USAGE

    Usage: $0 [-dr|--data-requirement <data-requirement-type>] [-v|--verbose]

    Options:
        -dr/--data-requirement:  Data requirement type to specifically compare
        -v/--verbose:           Use verbose comparison.
USAGE
    exit 1
}

# Clone the elm-parser-for-ecqms in the data-requirements directory if it hasn't been
if [ ! -d "elm-parser-for-ecqms" ]; then
    git clone https://github.com/projecttacoma/elm-parser-for-ecqms.git
    git fetch --all
    cd elm-parser-for-ecqms
    git checkout "fhir_review"
    ruby parse_elm.rb --bundle fhir
    cd ..
    mkdir elm-parser-dr
    SOURCE_DIR="elm-parser-for-ecqms/data_requirements/library"
    TARGET_DIR="elm-parser-dr"

    # Move all files from source to target directory
    mv "$SOURCE_DIR"/* "$TARGET_DIR"
    echo "Files moved successfully"
fi

echo "Gathering data-requirements output from fqm-execution using the measure bundle from ecqm-content-r4-2021"

npx ts-node compare.ts

# The following code directly compares the Library data requirements outputs of both fqm-execution and elm-parser-for-ecqms
# The problem with this is that the JSON is structured slightly differently so it may not even be helpful
FAILURES=()
for file in "fqm-e-dr"/*; do
    BASE_PATH="$(basename "$file")"
    BASE_NAME=${BASE_PATH%"-dr.json"*}

    FQM_E_DR=$file
    ELM_PARSER_DR="elm-parser-dr/${BASE_NAME}.xml.json"

    if ! test -f "$FQM_E_DR"; then
        echo -e "${RED}FAIL${NC}: $FQM_E_DR does not exist"
        FAILURES+=("$FQM_E_DR")
    fi

    if ! test -f "$ELM_PARSER_DR"; then
        echo -e "${RED}FAIL${NC}: $ELM_PARSER_DR does not exist"
        FAILURES+=("$ELM_PARSER_DR")
    fi

    if cmp --silent $FQM_E_DR $ELM_PARSER_DR; then  
        echo -e "${GREEN}PASS${NC}: $BASE_NAME"
    else 
        echo -e "${RED}FAIL${NC}: $FQM_E_DR and $ELM_PARSER_DR are different"
        FAILURES+=("$BASE_NAME")
    fi
done

echo "Finished"