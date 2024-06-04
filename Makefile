install:
	bun build ./cli.ts --compile --outfile=main.out
	if [ ! -L /usr/local/bin/course-sdk ]; then sudo ln -sf $(shell pwd)/main.out /usr/local/bin/course-sdk; fi
