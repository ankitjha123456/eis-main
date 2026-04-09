#!/bin/bash


#Check input
if [ "$#" -ne 4 ]; then
        echo "Usage:  $0 <server> <broker> <eg_name> <service_name>"
        return 1
fi

server=$1
broker=$2
eg=$3
service=$4


REMOTE_PATH="/var/mqsi/components/${broker}/servers/${eg}/run/${service}"


ssh -tq "$server" "

        cd $REMOTE_PATH || { echo 'Path not found'; exit 1; }


        # Find all .xsd file and cat them
        for file in *.xsd; do
                #pwd
                #ls
                if [ -e \"\$file\" ]; then
                        cat \"\$file\"
                else
                        echo 'No validation files around'
                        exit 1
                fi
        done
"
