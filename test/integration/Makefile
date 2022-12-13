BASE_PATH=$(shell dirname $BASH_SOURCE)

# Prevents the presence of a directory with the same name skipping Makefile targets
# TODO: Add other targets once defined
.PHONY: all proportion-boolean

# TODO: Add other targets once defined
all: .start-translator proportion-boolean

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
