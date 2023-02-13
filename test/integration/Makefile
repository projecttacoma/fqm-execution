# Finds the relative path of any modified or new CQL files for integration testing
MODIFIED_CQL_FILES=$(shell git status --porcelain ./**/*.cql | sed "s/^...//")

# Prevents the presence of a directory with the same name skipping Makefile targets
# TODO: Add other targets once defined
.PHONY: all proportion-boolean ratio-Encounter-reuseObservationFunction

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

# Needs more work
#ratio-Encounter-fullyLoadedWithReuseObservationFunction:
#	ecqm-bundler -c ./ratio-Encounter-fullyLoadedWithReuseObservationFunction/cql/ratio-Encounter-fullyLoadedWithReuseObservationFunction.cql -v ./valuesets --deps-directory ./helpers/cql --ipop ipp --numer num --denom denom --detailed-msrobs "fun3|numer" "fun3|denom" --scoring-code ratio --basis Encounter -o ./ratio-Encounter-fullyLoadedWithReuseObservationFunction/ratio-Encounter-fullyLoadedWithReuseObservationFunction-bundle.json

clean:
	-docker stop cql-translation-service
	-rm .start-translator
