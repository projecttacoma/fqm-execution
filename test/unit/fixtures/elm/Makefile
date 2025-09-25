all: .start-translator translate

.start-translator:
	docker pull cqframework/cql-translation-service:latest
	docker run --name cql-translation-service --rm -dit -p 8080:8080 cqframework/cql-translation-service:latest
	sleep 5
	touch .start-translator

FILES := $(shell find . -name "*.cql")

translate:
	$(info translating [${FILES}])
	rm -f ./output/*.json
	ts-node ./cql-translator.ts "$(FILES)"

clean:
	-docker stop cql-translation-service
	-rm .start-translator
