#!/bin/bash

# Check input
if [ "$#" -ne 4 ]; then
        echo "Usage: $0 <server> <broker> <eg_name> <service_name>"
        return 1
fi

server=$1
broker=$2
eg=$3
service=$4

REMOTE_PATH="/var/mqsi/components/${broker}/servers/${eg}/run/${service}"

ssh -tq "$server" "
        cd $REMOTE_PATH || { echo '{\"error\": \"Path not found\"}'; exit 1; }

        # Build JSON manually
        first=1
        result='{'

        for file in *.xsd; do
                if [ -e \"\$file\" ]; then
                        # Get filename without extension as key
                        key=\$(basename \"\$file\" .xsd)

                        # Read file content and escape special JSON characters
                        content=\$(cat \"\$file\" | sed 's/\\\\/\\\\\\\\/g; s/\"/\\\\\"/g; s/\t/\\\\t/g' | tr -d '\r' | awk '{printf \"%s\\\\n\", \$0}' | tr -d '\n')

                        if [ \"\$first\" -eq 1 ]; then
                                first=0
                        else
                                result=\"\$result,\"
                        fi

                        result=\"\$result\\\"'\$key'\\\":\\\"'\$content'\\\"\"
                else
                        echo '{\"error\": \"No validation files found\"}'
                        exit 1
                fi
        done

        result=\"\$result}\"
        echo \"\$result\"
"