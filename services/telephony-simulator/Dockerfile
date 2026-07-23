FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/api/package.json services/api/package.json
COPY services/telephony-simulator/package.json services/telephony-simulator/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace @voicenexus/telephony-simulator

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/telephony-simulator/package.json ./services/telephony-simulator/package.json
COPY --from=build /app/services/telephony-simulator/dist ./services/telephony-simulator/dist

EXPOSE 3100

CMD ["node", "services/telephony-simulator/dist/server.js"]