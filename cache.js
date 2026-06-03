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

LOADCACHE_PAYLOADS=(
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_DAILY_LIMIT_UPDATE_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_INTERNATIONAL_FLAG_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_DAILY_LIMIT_ENQUIRY_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_PIN_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_PG_FLAG_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_FLAG_ATM_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_DOMESTIC_FLAG_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_NFC_POS_FLAG_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_CARD_Sys_URL"}]'
    '[{"FIELD_VALUE":"http://system.api:9022/virtualCard/atm/misc","FIELD_NAME":"IT_ATM_POS_FLAG_Sys_URL"}]'
)

# ─────────────────────────────────────────────
# PHASE 1 — cacheOnDB for all 4 servers
# ─────────────────────────────────────────────
echo ">>> Phase 1: Triggering cacheOnDB on all servers..."

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

# Print Phase 1 result as JSON array
echo "["
total=${#RESULTS[@]}
for i in "${!RESULTS[@]}"; do
    comma=","
    [ $((i + 1)) -eq $total ] && comma=""
    echo "  ${RESULTS[$i]}${comma}"
done
echo "]"

# ─────────────────────────────────────────────
# PHASE 2 — loadCache for .71 and .72 fully parallel
# ─────────────────────────────────────────────
echo ""
echo ">>> Phase 2: Triggering loadCache on ${LOADCACHE_SERVERS[*]} (fully parallel)..."

for server in "${LOADCACHE_SERVERS[@]}"; do
    for payload in "${LOADCACHE_PAYLOADS[@]}"; do
        (
            response=$(su - eisuser -c \
                "ssh -o StrictHostKeyChecking=no \
                     -o ConnectTimeout=10 \
                     -o BatchMode=yes \
                     ${server} \
                     \"curl -k --silent -X POST \
                       -H 'Content-Type: application/json' \
                       'http://localhost:${PORT}${LOADCACHE_ENDPOINT}' \
                       -d '${payload}'\"" 2>/dev/null)
            field=$(echo "$payload" | grep -o '"FIELD_NAME":"[^"]*"' | cut -d: -f2 | tr -d '"')
            echo "  [${server}] ${field}: ${response}"
        ) &
    done
done

wait

echo ""
echo ">>> Done."