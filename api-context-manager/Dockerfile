FROM node:20-alpine

WORKDIR /app

# Install deps (cached layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 3000

# Default: production. Overridden to "npm run dev" in docker-compose for dev.
CMD ["npm", "start"]
