FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/api/package.json services/api/package.json
COPY services/telephony-simulator/package.json services/telephony-simulator/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN npm ci

COPY . .

RUN npm run prisma:generate --workspace @voicenexus/api
RUN npm run build --workspace @voicenexus/api

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/prisma ./services/api/prisma
COPY --from=build /app/services/api/prisma.config.ts ./services/api/prisma.config.ts
COPY services/api/docker-entrypoint.sh ./services/api/docker-entrypoint.sh

RUN chmod +x ./services/api/docker-entrypoint.sh

EXPOSE 3000

CMD ["./services/api/docker-entrypoint.sh"]