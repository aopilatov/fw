#!/bin/bash

set -e

GCP_PROJECT_ID="org-registries"
NPM_REGISTRY="https://europe-npm.pkg.dev/org-registries/npm"

echo "Building"
pnpm run build

echo "Setting GCP project to $GCP_PROJECT_ID..."
gcloud config set project "$GCP_PROJECT_ID"

echo "Set quota to $GCP_PROJECT_ID..."
gcloud auth application-default set-quota-project "$GCP_PROJECT_ID"

echo "Publishing package to $NPM_REGISTRY..."
pnpm publish --registry="$NPM_REGISTRY" --no-git-checks

echo "Done."
