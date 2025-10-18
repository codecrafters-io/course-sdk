install:
	bun build ./cli.ts --compile --outfile=main.out
	if [ ! -L /usr/local/bin/course-sdk ]; then sudo ln -sf $(shell pwd)/main.out /usr/local/bin/course-sdk; fi

update_schemas:
	gh repo clone codecrafters-io/core /tmp/codecrafters-core-tmp
	cp /tmp/codecrafters-core-tmp/data/course_definition_schema.json ./schemas/course-definition.json
	rm -rf /tmp/codecrafters-core-tmp