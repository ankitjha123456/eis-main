#!/bin/bash

SERVERS=(
    "10.177.44.71"
    "10.177.44.72"
    "10.177.44.73"
    "10.177.44.74"
)

LOADCACHE_SERVERS=(
    "10.177.44.71"
    "10.177.44.72"
)

PORT="8002"
ENDPOINT="/cacheOnDB"
LOADCACHE_ENDPOINT="/cache/v1/loadCache"
FIELD_VALUE="http://system.api:9022/virtualCard/atm/misc"

LOADCACHE_FIELDS=(
    "IT_ATM_DAILY_LIMIT_UPDATE_Sys_URL"
    "IT_ATM_INTERNATIONAL_FLAG_Sys_URL"
    "IT_ATM_DAILY_LIMIT_ENQUIRY_Sys_URL"
    "IT_ATM_PIN_Sys_URL"
    "IT_ATM_PG_FLAG_Sys_URL"
    "IT_ATM_FLAG_ATM_Sys_URL"
    "IT_ATM_DOMESTIC_FLAG_Sys_URL"
    "IT_ATM_NFC_POS_FLAG_Sys_URL"
    "IT_ATM_CARD_Sys_URL"
    "IT_ATM_POS_FLAG_Sys_URL"
)

# ─────────────────────────────────────────────
# PHASE 1 — cacheOnDB for all 4 servers
# ─────────────────────────────────────────────
mapfile -t PHASE1_RESULTS < <(
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
            [ "$cache_val" = "$response" ] && cache_val="NO_RESPONSE"
            echo "{\"server\":\"${server}\",\"CACHE_RESPONSE\":\"${cache_val}\"}"
        ) &
    done
    wait
)

# ─────────────────────────────────────────────
# PHASE 2 — loadCache for .71 and .72 fully parallel
# ─────────────────────────────────────────────
mapfile -t PHASE2_RESULTS < <(
    for server in "${LOADCACHE_SERVERS[@]}"; do
        for field in "${LOADCACHE_FIELDS[@]}"; do
            (
                response=$(su - eisuser -c \
                    "ssh -o StrictHostKeyChecking=no \
                         -o ConnectTimeout=10 \
                         -o BatchMode=yes \
                         ${server} bash" << EOF 2>/dev/null
curl -k --silent -X POST \
  -H "Content-Type: application/json" \
  "http://localhost:${PORT}${LOADCACHE_ENDPOINT}" \
  -d '[{"FIELD_VALUE":"${FIELD_VALUE}","FIELD_NAME":"${field}"}]'
EOF
                )
                resp_val=$(echo "$response" | sed 's/.*"RESPONSE":"\([^"]*\)".*/\1/')
                [ "$resp_val" = "$response" ] && resp_val="NO_RESPONSE"

                echo "{\"server\":\"${server}\",\"FIELD_NAME\":\"${field}\",\"RESPONSE\":\"${resp_val}\"}"
            ) &
        done
    done
    wait
)

# ─────────────────────────────────────────────
# PRINT FINAL FLAT JSON ARRAY
# ─────────────────────────────────────────────
ALL_RESULTS=("${PHASE1_RESULTS[@]}" "${PHASE2_RESULTS[@]}")

echo "["
total=${#ALL_RESULTS[@]}
for i in "${!ALL_RESULTS[@]}"; do
    comma=","
    [ $((i + 1)) -eq $total ] && comma=""
    echo "  ${ALL_RESULTS[$i]}${comma}"
done
echo "]"