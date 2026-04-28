FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set build-time env vars if needed
# ENV NEXT_PUBLIC_API_URL=...
RUN npm run build

FROM node:18-slim AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV production
# Cloud Run default port
ENV PORT 8080
EXPOSE 8080
CMD ["npm", "start", "--", "-p", "8080"]
