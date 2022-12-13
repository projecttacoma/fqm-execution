#!/bin/bash

dir=$(dirname $BASH_SOURCE)

ecqm-bundler -c $dir/cql/proportion-boolean.cql --deps $dir/../helpers/cql/FHIRHelpers-4.0.1.cql --ipop ipp --numer numer --denom denom --scoring-code proportion --basis boolean -o $dir/proportion-boolean-bundle.json
