# ─────────────────────────────────────────────
# PHASE 2 — loadCache via eisuser SSH, curl on localhost
# ─────────────────────────────────────────────
echo ""
echo ">>> Phase 2: Triggering loadCache on ${LOADCACHE_SERVERS[*]} (fully parallel)..."

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

for server in "${LOADCACHE_SERVERS[@]}"; do
    for field in "${LOADCACHE_FIELDS[@]}"; do
        (
            payload="[{\"FIELD_VALUE\":\"${FIELD_VALUE}\",\"FIELD_NAME\":\"${field}\"}]"

            response=$(su - eisuser -c \
                "ssh -o StrictHostKeyChecking=no \
                     -o ConnectTimeout=10 \
                     -o BatchMode=yes \
                     ${server} \
                     \"curl -k --silent -X POST \
                       -H 'Content-Type: application/json' \
                       'http://localhost:${PORT}${LOADCACHE_ENDPOINT}' \
                       -d '[{\\\"FIELD_VALUE\\\":\\\"${FIELD_VALUE}\\\",\\\"FIELD_NAME\\\":\\\"${field}\\\"}]'\"" 2>/dev/null)

            echo "  [${server}] ${field}: ${response}"
        ) &
    done
done

wait

echo ""
echo ">>> Done."