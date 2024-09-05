#!/bin/sh

make install

bun serve.ts &
SERVER_PID=$!

echo "Started server, PID: $SERVER_PID"

(cd ../courses/build-your-own-sqlite && course-sdk) &

sleep 5

echo "Killing server ($SERVER_PID)"
kill $SERVER_PID

sleep 100
