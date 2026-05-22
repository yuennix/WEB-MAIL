#!/bin/bash
set -e

export BASE_PATH="/"
export NODE_ENV="production"

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building webmail..."
pnpm --filter @workspace/webmail run build

echo "Copying output to public/..."
mkdir -p public
cp -r artifacts/webmail/dist/public/. public/

echo "Build complete!"
