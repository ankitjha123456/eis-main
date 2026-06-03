#!/bin/bash

SERVERS=(
    "10.177.44.71"
    "10.177.44.72"
    "10.177.44.73"
    "10.177.44.74"
)

PORT="8002"
ENDPOINT="/cacheOnDB"

# Collect all parallel outputs into array
mapfile -t RESULTS < <(
    for server in "${SERVERS[@]}"; do
        (
            response=$(su - eisuser -c \
                "ssh -o StrictHostKeyChecking=no \
                     -o ConnectTimeout=10 \
                     -o BatchMode=yes \
                     ${server} \
                     \"curl --silent --location 'http://localhost:${PORT}${ENDPOINT}' \
                       -H 'Content-Type: application/json' \
                       -d '{\\\"UPDATE\\\":\\\"Y\\\"}' \"" 2>/dev/null)

            cache_val=$(echo "$response" | sed 's/.*"CACHE_RESPONSE":"\([^"]*\)".*/\1/')

            echo "{\"server\":\"${server}\",\"CACHE_RESPONSE\":\"${cache_val}\"}"
        ) &
    done
    wait
)

# Print as JSON array
echo "["
total=${#RESULTS[@]}
for i in "${!RESULTS[@]}"; do
    comma=","
    [ $((i + 1)) -eq $total ] && comma=""
    echo "  ${RESULTS[$i]}${comma}"
done
echo "]"




curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_DAILY_LIMIT_UPDATE_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_INTERNATIONAL_FLAG_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_DAILY_LIMIT_ENQUIRY_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_PIN_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_PG_FLAG_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_FLAG_ATM_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_DOMESTIC_FLAG_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_NFC_POS_FLAG_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_CARD_Sys_URL"}]'&
curl -k -X POST 'http://10.177.44.71:8002/cache/v1/loadCache' -d '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc", "FIELD_NAME":"IT_ATM_POS_FLAG_Sys_URL"}]'&
