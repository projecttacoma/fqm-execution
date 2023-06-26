# Finds the relative path of any modified or new CQL files for integration testing

ifeq "$(FORCE)" "true"
MODIFIED_CQL_FILES=$(shell find . -type f -name "*.cql" -not -path "./helpers/*")
else
MODIFIED_CQL_FILES=$(shell git status --porcelain ./**/*.cql -- ':!helpers' | sed "s/^...//")
endif

# Prevents the presence of a directory with the same name skipping Makefile targets
# TODO: Add other targets once defined
.PHONY: all proportion-boolean ratio-Encounter-reuseObservationFunction composite-all-or-nothing composite-weighted proportion-Encounter-tuple

# This loop grabs the important directory name from the full path to the cql file
# This directory name MUST match the make target name in this file
all: .start-translator
	@for f in $(MODIFIED_CQL_FILES) ; do \
		replacement_suffix=$${f%/cql/*}; \
		make_target_name=$${replacement_suffix#test/integration/} ; \
		make $$make_target_name ; \
	done

.start-translator:
	docker pull cqframework/cql-translation-service:latest
	docker run --name cql-translation-service --rm -dit -p 8080:8080 cqframework/cql-translation-service:latest
	sleep 5
	touch .start-translator

proportion-boolean:
	ecqm-bundler -c ./proportion-boolean/cql/proportion-boolean.cql -v ./valuesets --deps-directory ./helpers/cql --ipop ipp --numer numer --denom denom --scoring-code proportion --basis boolean -o ./proportion-boolean/proportion-boolean-bundle.json

ratio-Encounter-reuseObservationFunction:
	ecqm-bundler -c ./ratio-Encounter-reuseObservationFunction/cql/ratio-Encounter-reuseObservationFunction.cql -v ./valuesets --deps-directory ./helpers/cql --ipop ipp --numer numer --denom denom --detailed-msrobs "daysObs|numer" "daysObs|denom" --scoring-code ratio --basis Encounter -o ./ratio-Encounter-reuseObservationFunction/ratio-Encounter-reuseObservationFunction-bundle.json

composite-all-or-nothing:
	ecqm-bundler generate -c ./composite-all-or-nothing/cql/all-or-nothing-component-one.cql --deps-directory ./helpers/cql --measure-version "0.0.1" --ipop "Initial Population" --numer "Numerator" --denom "Denominator" -o /tmp/comp1.json \
	  && ecqm-bundler generate -c ./composite-all-or-nothing/cql/all-or-nothing-component-two.cql --deps-directory ./helpers/cql --ipop "Initial Population" --numer "Numerator" --denom "Denominator" --measure-version "0.0.1" -o /tmp/comp2.json \
		&& ecqm-bundler make-composite /tmp/comp1.json /tmp/comp2.json --composite-scoring "all-or-nothing" --detailed-component "measure-AllOrNothingComponentTwo|0.0.1" "measure-AllOrNothingComponentOne|0.0.1" -o ./composite-all-or-nothing/composite-all-or-nothing-bundle.json \
		&& rm /tmp/comp1.json /tmp/comp2.json

composite-weighted:
	ecqm-bundler generate -c ./composite-weighted/cql/weighted-component-one.cql --deps-directory ./helpers/cql --measure-version "0.0.1" --ipop "Initial Population" --numer "Numerator" --denom "Denominator" -o /tmp/comp1.json \
	  && ecqm-bundler generate -c ./composite-weighted/cql/weighted-component-two.cql --deps-directory ./helpers/cql --ipop "Initial Population" --numer "Numerator" --denom "Denominator" --measure-version "0.0.1" -o /tmp/comp2.json \
		&& ecqm-bundler make-composite /tmp/comp1.json /tmp/comp2.json --composite-scoring "weighted" --detailed-component "measure-WeightedComponentOne|0.0.1##3" "measure-WeightedComponentTwo|0.0.1##1" -o ./composite-weighted/composite-weighted-bundle.json \
		&& rm /tmp/comp1.json /tmp/comp2.json

proportion-Encounter-tuple:
	ecqm-bundler -c ./proportion-Encounter-tuple/cql/proportion-Encounter-tuple.cql -v ./valuesets --deps-directory ./helpers/cql --ipop ipp --numer numer --denom denom --basis Encounter -o ./proportion-Encounter-tuple/proportion-Encounter-tuple-bundle.json

clean:
	-docker stop cql-translation-service
	-rm .start-translator
