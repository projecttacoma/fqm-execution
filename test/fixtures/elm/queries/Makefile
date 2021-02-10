all: .start-translator translate

.start-translator:
	docker pull cqframework/cql-translation-service:latest
	docker run --name cql-translation-service --rm -dit -p 8080:8080 cqframework/cql-translation-service:latest
	sleep 5
	touch .start-translator

FILES := $(shell find *.cql)

define get_file_args
	$(eval FILE_ARGS += -F $(basename $1)=@$1)
endef

translate:
	$(info $$FILES is [${FILES}])
	$(foreach f, $(FILES),$(call get_file_args,$(f)))
	$(info $$FILE_ARGS is [${FILE_ARGS}])
	curl $(FILE_ARGS) "http://localhost:8080/cql/translator?locators=true&annotations=true" > translation-output

clean:
	-docker stop cql-translation-service
	-rm .start-translator
	-rm translation-output
