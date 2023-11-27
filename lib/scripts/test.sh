#!/bin/sh
set -e

CODECRAFTERS_SUBMISSION_DIR=/app

test -d /app-cached && cp -p -R /app-cached/. "$CODECRAFTERS_SUBMISSION_DIR"

if [ -f /codecrafters-precompile.sh ]; then
    echo ""
    /bin/sh /codecrafters-precompile.sh | sed $'s/^/\x1b[33m[compile]\x1b[0m /' || exit 1
    echo ""
fi

exec /tester/test.sh
