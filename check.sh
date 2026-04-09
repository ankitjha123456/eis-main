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
        cd $REMOTE_PATH || { echo '<error>Path not found</error>'; exit 1; }

        echo '<?xml version=\"1.0\" encoding=\"UTF-8\"?>'
        echo '<validationFiles>'

        for file in *.xsd; do
                if [ -e \"\$file\" ]; then
                        key=\$(basename \"\$file\" .xsd)

                        echo \"  <\$key>\"
                        echo '    <fileName>'\"\$file\"'</fileName>'
                        echo '    <fileContent>'
                        cat \"\$file\"
                        echo '    </fileContent>'
                        echo \"  </\$key>\"
                else
                        echo '<error>No validation files found</error>'
                        exit 1
                fi
        done

        echo '</validationFiles>'
"