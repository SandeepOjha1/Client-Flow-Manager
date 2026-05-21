#!/bin/sh
# Run from the project root:  sh scripts/src/seed-local.sh
#
# Reads MONGODB_URI from artifacts/api-server/.env if it exists,
# then runs the seed script.

ENV_FILE="artifacts/api-server/.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$MONGODB_URI" ]; then
  echo "ERROR: MONGODB_URI is not set."
  echo "Either set it in $ENV_FILE or export it before running this script."
  exit 1
fi

pnpm --filter @workspace/scripts run seed
