#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

MUST_SUPPORT=false

function usage() {
    cat <<USAGE

    Usage: $0 [-m|--measure <measure-name>] 

    Options:
        -m/--measure:   Name of the CMS measure to compare data requirements results (default: all)
USAGE
    exit 1
}

while test $# != 0
do 
    case "$1" in
    -m | --measure) 
        shift
        MEASURE=$1
        ;;
    *) usage ;;
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
    ruby parse_elm.rb --bundle fhir
    cd ..
    if [-d "elm-parser-dr"]; then
        rm -rf elm-parser-dr
    fi
    mkdir elm-parser-dr
    SOURCE_DIR="elm-parser-for-ecqms/data_requirements/library"
    TARGET_DIR="elm-parser-dr"

    # Move all files from source to target directory
    mv "$SOURCE_DIR"/* "$TARGET_DIR"
fi

echo "Gathering data-requirements output from fqm-execution using the measure bundles from the January 2024 Connectathon"

npx ts-node fqm-e-dr.ts

npx ts-node summary-compare.ts $MEASURE 