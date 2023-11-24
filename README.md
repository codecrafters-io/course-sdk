This repository is used to develop & test CodeCrafters challenges.

## Installation

- Make sure that you have [Docker](https://docs.docker.com/engine/install/) installed.
- Download the latest release. (TODO: Add link)
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

```sh
course-sdk compile # compiles all languages
course-sdk compile go # compiles only Go
```

To add support for a new language (TODO, not working yet):

```sh
course-sdk add-language <language>
```