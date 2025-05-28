# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

# Copy necessary production files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./next.config.ts

# ✅ Inject env file for production
# COPY .env.docker .env
ARG ENV_DOCKER
RUN echo "$ENV_DOCKER" > .env

# Install only production dependencies
RUN npm install --production

# Set port and expose
ENV PORT=80
EXPOSE 80

CMD ["npm", "start"]
