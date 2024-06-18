#!/bin/sh
set -e

CODECRAFTERS_SUBMISSION_DIR=/app

test -d /app-cached && cp -p -R /app-cached/. "$CODECRAFTERS_SUBMISSION_DIR"

if [ -f /codecrafters-precompile.sh ]; then
    start_time=$(date +%s%3N)
    echo ""
    /bin/sh /codecrafters-precompile.sh | sed $'s/^/\x1b[33m[compile]\x1b[0m /' || exit 1
    echo ""
    end_time=$(date +%s%3N)

    echo "Precompile time: $((end_time - start_time)) milliseconds"
    echo ""
fi

exec /tester/test.sh
