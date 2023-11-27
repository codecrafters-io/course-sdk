#!/bin/bash

test $# -gt 0 && cd $1

test -f course-definition.yml || {
	echo >&2 "error: course-definition.yml not found"
	echo >&2
	echo >&2 "usage: $0 [course_path]"
	echo >&2 "    course_path is current directory by default"

	exit 2
}

stages_json=$( yq -o=j course-definition.yml | jq -c '.stages | keys[] as $i | {index: $i, slug: .[$i].slug}' )
stages_new=$( echo "$stages_json" | jq -r '["printf", "%02d-%s\\n", (.index + 1), .slug] | @sh' | sh )

function contains {
	local set="$1"
	local elem="$2"

	echo "$set" | jq -Rne "[inputs | . == \"$elem\"] | any" >/dev/null
}

status=0

for lang in `ls "solutions"`; do
	for dir in `ls "solutions/$lang"`; do
		if contains "$stages_new" "$dir"; then
			continue
		fi

		echo -n "unexpected file: $lang/$dir"
		echo ", expected format: <two_digit_stage_number>-<stage_slug> (ex: \"01-init\")"
		status=1
	done
done

exit $status
