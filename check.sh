#!/bin/bash

SOURCE_IP=$1    # The server nc will run FROM
TARGET_IP=$2    # The server nc will check TO
PORT=$3         # Port to check

THIS_SERVER="10.177.44.58"   # IP of the machine running this script
SSH_USER="eisuser"              # SSH username for remote servers
NC_TIMEOUT=5                 # nc wait timeout in seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

if [ -z "$SOURCE_IP" ] || [ -z "$TARGET_IP" ] || [ -z "$PORT" ]; then
  echo -e "${RED}ERROR: Missing arguments${RESET}"
  echo ""
  echo "Usage:"
  echo "  $0 <source_ip> <target_ip> <port>"
  echo ""
  echo "Examples:"
  echo "  $0 10.177.44.58 192.168.1.100 3306"
  echo "  $0 10.177.44.59 192.168.1.100 443"
  exit 1
fi

# ── Validate port ──────────────────────────────────────────
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo -e "${RED}ERROR: Port must be a number between 1 and 65535${RESET}"
  exit 1
fi

# ── Print info ─────────────────────────────────────────────
echo ""
echo -e "  Source IP      : ${YELLOW}${SOURCE_IP}${RESET}
 "  Target IP      : ${YELLOW}${TARGET_IP}${RESET}
echo -e "  Port           : ${YELLOW}${PORT}${RESET}"

# ── LOCAL or SSH ───────────────────────────────────────────
if [ "$SOURCE_IP" = "$THIS_SERVER" ]; then

  RESULT=$(nc -vz -w "$NC_TIMEOUT" "$TARGET_IP" "$PORT" 2>&1)
  EXIT_CODE=$?

else
  # Source is a different server — SSH into it and run nc from there
  echo -e "${CYAN}--------------------------------------------${RESET}"
  echo ""

  RESULT=$(su - eisuser -c "ssh \
    -o ConnectTimeout=8 \
    -o StrictHostKeyChecking=no \
    -o BatchMode=yes \
    -o LogLevel=ERROR \
    eisuser@${SOURCE_IP} \
    'nc -vz -w ${NC_TIMEOUT} ${TARGET_IP} ${PORT} 2>&1'")
  EXIT_CODE=$?

  # Exit code 255 means SSH itself failed (not nc)
  if [ $EXIT_CODE -eq 255 ]; then
    echo -e "${RED}SSH CONNECTION FAILED to ${SOURCE_IP}${RESET}"
    echo "    ssh ${SSH_USER}@${SOURCE_IP} 'echo connected'"
    echo ""
    exit 1
  fi

fi

# ── Show raw output ────────────────────────────────────────
echo -e "Raw Output:"
echo -e "  ${RESULT}"
echo ""

# ── Determine OPEN or CLOSED ───────────────────────────────
RESULT_LOWER=$(echo "$RESULT" | tr '[:upper:]' '[:lower:]')

if echo "$RESULT_LOWER" | grep -qE "succeeded|open|connected" || [ $EXIT_CODE -eq 0 ]; then
  STATUS="OPEN"
else
  STATUS="CLOSED"
fi

# ── Print result ───────────────────────────────────────────
echo -e "${CYAN}--------------------------------------------${RESET}"
if [ "$STATUS" = "OPEN" ]; then
  echo -e "  Result : ${GREEN}✅  PORT OPEN${RESET}"
  echo -e "  ${SOURCE_IP} → ${TARGET_IP}:${PORT} is REACHABLE"
else
  echo -e "  Result : ${RED}❌  PORT CLOSED / UNREACHABLE${RESET}"
  echo -e "  ${SOURCE_IP} → ${TARGET_IP}:${PORT} is NOT reachable"
fi
echo -e "${CYAN}============================================${RESET}"
echo ""

# Exit 0 = open, 1 = closed
[ "$STATUS" = "OPEN" ] && exit 0 || exit 1
