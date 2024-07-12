#!/bin/sh
set -e

CODECRAFTERS_SUBMISSION_DIR=/app

# This is POSIX sh so we can't use pipefail. Workaround by killing parent process
self=$$

# Ensure we exit with code 1 when parent is killed using TERM
trap 'exit 1' TERM

test -d /app-cached && cp -p -R /app-cached/. "$CODECRAFTERS_SUBMISSION_DIR"

if [ -f "${CODECRAFTERS_SUBMISSION_DIR}/.codecrafters/compile.sh" ]; then
    echo ""
    (/bin/sh "${CODECRAFTERS_SUBMISSION_DIR}/.codecrafters/compile.sh" || kill -s TERM $self) | sed $'s/^/\x1b[33m[compile]\x1b[0m /'
    echo ""
elif [ -f /codecrafters-precompile.sh ]; then
    echo ""
    (/bin/sh /codecrafters-precompile.sh || kill -s TERM $self) | sed $'s/^/\x1b[33m[compile]\x1b[0m /'
    echo ""
fi

# Move .codecrafters/run.sh --> your_program.sh if present
if [ -f "${CODECRAFTERS_SUBMISSION_DIR}/.codecrafters/run.sh" ]; then
    cp "${CODECRAFTERS_SUBMISSION_DIR}/.codecrafters/run.sh" "${CODECRAFTERS_SUBMISSION_DIR}/your_program.sh"
fi

exec /tester/test.sh
