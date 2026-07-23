#!/bin/sh
set -eu

npm run prisma:deploy --workspace @voicenexus/api

exec node services/api/dist/server.js