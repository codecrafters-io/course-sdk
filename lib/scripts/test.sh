#!/bin/sh
set -e

# This is POSIX sh so we can't use pipefail. Workaround by killing parent process
self=$$

# Ensure we exit with code 1 when parent is killed using TERM
trap 'exit 1' TERM

test -d /app-cached && cp -p -R /app-cached/. "$CODECRAFTERS_REPOSITORY_DIR"

if [ -f "${CODECRAFTERS_REPOSITORY_DIR}/.codecrafters/compile.sh" ]; then
    echo ""
    (/bin/sh "${CODECRAFTERS_REPOSITORY_DIR}/.codecrafters/compile.sh" || kill -s TERM $self) 2>&1 | sed $'s/^/\x1b[33m[compile]\x1b[0m /'
    echo ""
elif [ -f /codecrafters-precompile.sh ]; then
    echo ""
    (/bin/sh /codecrafters-precompile.sh || kill -s TERM $self) 2>&1 | sed $'s/^/\x1b[33m[compile]\x1b[0m /'
    echo ""
fi

# Move .codecrafters/run.sh --> your_program.sh if present
if [ -f "${CODECRAFTERS_REPOSITORY_DIR}/.codecrafters/run.sh" ]; then
    cp "${CODECRAFTERS_REPOSITORY_DIR}/.codecrafters/run.sh" "${CODECRAFTERS_REPOSITORY_DIR}/your_program.sh"
fi

exec "${CODECRAFTERS_REPOSITORY_DIR}/your_program.sh"
