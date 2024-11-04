#!/bin/bash

if [ ! -z "$(git status --untracked-files=no --porcelain)" ]; then 
  echo "Changes detected in working directory. Either stash or commit them before running regression"
  exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

VERBOSE=false
BASE_BRANCH="master"

function usage() {
    cat <<USAGE

    Usage: $0 [-b|--base-branch <branch-name>] [-v|--verbose]

    Options:
        -b/--base-branch:   Base branch to compare results with (default: master)
        -v/--verbose:       Use verbose regression. Will print out diffs of failing JSON files with spacing (default: false)
USAGE
    exit 1
}

while test $# != 0
do
    case "$1" in
    -v | --verbose) VERBOSE=true ;;
    -b | --base-branch)
      shift
      BASE_BRANCH=$1
      ;;
    *)  usage ;;
    esac
    shift
done

if [ ! -d "regression/connectathon" ]; then
  git clone https://github.com/dbcg/connectathon.git regression/connectathon
fi

if [ ! -d "regression/ecqm-content-r4-2021" ]; then
  git clone https://github.com/cqframework/ecqm-content-r4-2021.git regression/ecqm-content-r4-2021
fi

if [ ! -d "regression/ecqm-content-qicore-2022" ]; then
  git clone https://github.com/cqframework/ecqm-content-qicore-2022.git regression/ecqm-content-qicore-2022
fi

if [ ! -d "regression/coverage-script-bundles" ]; then
  git clone https://gitlab.mitre.org/flame/coverage-script-bundles.git regression/coverage-script-bundles
fi

git fetch --all

CURRENT_BRANCH=$(git symbolic-ref --short -q HEAD)

if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
  echo "Cannot run regression while on the base branch, ensure current branch is different from base"
  exit 1
fi

TIMESTAMP=$(date +%s)

echo "Gathering results on current branch '$CURRENT_BRANCH'"

npm i
npx ts-node --files ./regression/regression.ts "$CURRENT_BRANCH-$TIMESTAMP" $VERBOSE

echo "Gathering results on base branch '$BASE_BRANCH'"
git checkout $BASE_BRANCH

npm i
npx ts-node --files ./regression/regression.ts "$BASE_BRANCH-$TIMESTAMP" $VERBOSE

FAILURES=()
BASE_BRANCH_BASE_PATH="regression/output/$BASE_BRANCH-$TIMESTAMP"
CURRENT_BRANCH_BASE_PATH="regression/output/$CURRENT_BRANCH-$TIMESTAMP"
for fname in $CURRENT_BRANCH_BASE_PATH/**/*.json; do
  # Gets the name of the test file itself ignoring the base path
  END_PATH=${fname#*/*/*/}
  P1="$CURRENT_BRANCH_BASE_PATH/$END_PATH"
  P2="$BASE_BRANCH_BASE_PATH/$END_PATH"

  if ! test -f "$P1"; then
    echo -e "${RED}FAIL${NC}: $P1 does not exist"
    FAILURES+=("$P1")
  fi

  if ! test -f "$P2"; then
    echo -e "${RED}FAIL${NC}: $P2 does not exist"
    FAILURES+=("$P2")
  fi

  if cmp --silent $P1 $P2 ; then
    echo -e "${GREEN}PASS${NC}: $END_PATH"
  else
    echo -e "${RED}FAIL${NC}: $P1 and $P2 are different"
    FAILURES+=("$END_PATH")

    if [ $VERBOSE = "true" ]; then
      diff $P1 $P2
    fi
  fi
done

if [ ${#FAILURES[@]} -gt 0 ]; then
  printf "\n\nSummary of All Failures:\n\n"

  for s in "${FAILURES[@]}"; do
    echo -e "${RED}FAIL${NC}: $s"
  done

  printf "\n\n"
  git checkout $CURRENT_BRANCH
  exit 1
else
  printf "\n\nRegression Passed\n\n"
  git checkout $CURRENT_BRANCH
fi

