install:
	bun build ./cli.ts --compile --outfile ./compiled
	sudo mv ./compiled /usr/local/bin/course-sdk