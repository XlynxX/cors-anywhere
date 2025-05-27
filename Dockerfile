FROM ghcr.io/puppeteer/puppeteer:24.8.2

# Set environment variables to skip Chromium download and point to your own Chrome installation
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install dependencies (like Chrome) if needed
RUN apt-get update && apt-get install -y \
  google-chrome-stable \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npm", "start"]

# Expose the port the app runs on
EXPOSE 10000
