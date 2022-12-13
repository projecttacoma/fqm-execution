BASE_PATH=$(shell dirname $BASH_SOURCE)

# Finds the relative path of any modified or new CQL files for integration testing
MODIFIED_CQL_FILES=$(shell git status --porcelain $(BASE_PATH)/**/*.cql | sed "s/^...//")

# Prevents the presence of a directory with the same name skipping Makefile targets
# TODO: Add other targets once defined
.PHONY: all proportion-boolean

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
	$(BASE_PATH)/proportion-boolean/generate.sh

clean:
	-docker stop cql-translation-service
	-rm .start-translator
