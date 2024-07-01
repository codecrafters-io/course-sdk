This repository is used to develop & test CodeCrafters challenges.

## Installation

- Make sure that you have [Docker](https://docs.docker.com/engine/install/) installed.
- For now, you'll need to compile the SDK from source using Bun.
  - Make sure you have [Bun](https://bun.sh/docs/installation) installed.
  - Clone this repository and run `bun install && make install`
  - (In the future, we'll publish pre-compiled binaries for the SDK)
  - `lstat` is not present in MacOS, create a symlink to `stat` in usr/local/bin `sudo ln -s /usr/bin/stat /usr/local/bin/lstat`
- Test it with `course-sdk --version`.

## Developing Courses

We'll use [`build-your-own-git`](https://github.com/codecrafters-io/build-your-own-git) as an example here.

Clone the course repository and cd into it:

```sh
git clone https://github.com/codecrafters-io/build-your-own-git.git
cd build-your-own-git
```

### Running tests

Run this command to compile and test Go solutions:

```sh
course-sdk test go # test all stages for Go
course-sdk test go stage_slug_1,stage_slug_2 # test only specific stages
```

### Compiling starter code & solutions

If you want to just compile the starter code & solutions, and not run tests:

```sh
course-sdk compile # compiles all languages
course-sdk compile go # compiles only Go
```

To add support for a new language (TODO, not working yet):

```sh
course-sdk add-language <language>
```
