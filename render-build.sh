#!/usr/bin/env bash
set -o errexit

# Install dependencies
npm install

# Ensure the Puppeteer cache directory exists
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

# Install Puppeteer and download Chrome
npx puppeteer browsers install chrome
npm run postinstall

# Check if the Chromium binary exists in the Puppeteer cache
echo "Checking if chromium exists..."
ls -l /opt/render/.cache/puppeteer/chrome/ || echo "Chromium not found!"

# Create the necessary cache directory for the build
mkdir -p /opt/render/project/src/.cache/puppeteer/chrome/

# Store/pull Puppeteer cache with build cache
if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then
    echo "...Copying Puppeteer Cache from Build Cache"
    cp -R /opt/render/project/src/.cache/puppeteer/chrome/ $PUPPETEER_CACHE_DIR
else
    echo "...Storing Puppeteer Cache in Build Cache"
    cp -R $PUPPETEER_CACHE_DIR /opt/render/project/src/.cache/puppeteer/chrome/
fi

# Verify where Puppeteer is placing Chromium (log output)
echo "PUPPETEER_EXECUTABLE_PATH is set to: $PUPPETEER_EXECUTABLE_PATH"
