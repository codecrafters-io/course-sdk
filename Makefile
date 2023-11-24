install:
	bun build ./cli.ts --compile --outfile /tmp/course-sdk
	sudo mv /tmp/course-sdk /usr/local/bin/course-sdk