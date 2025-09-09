#!/bin/bash

# This script fetches all repositories from the `marine-term-translations` organization
# using the GitHub API, filters repositories with names containing a hyphen (`-`),
# and echoes the filtered repository names.

# Exit immediately if a command exits with a non-zero status
set -e
# Ensure the GitHub token is set as an environment variable
# Removed dependency on GITHUB_TOKEN as the organization is open and does not require authentication.

# GitHub API URL for fetching repositories
GITHUB_API_URL="https://api.github.com/orgs/marine-term-translations/repos"

# Fetch all repositories from the organization
# Use the GitHub token for authentication
response=$(curl -s "$GITHUB_API_URL")

# Check if the response is empty
if [ -z "$response" ]; then
  echo "Error: Failed to fetch repositories. Please check your network connection."
  exit 1
fi

echo "Fetched repositories from marine-term-translations organization."
# Extract repository names and filter those containing a hyphen (`-`)
echo "Filtered repository names:"
# Extract repository names and filter those containing a hyphen (`-`) without using jq
echo "$response" | grep -o '"name": *"[^"]*"' | grep '-' | sed 's/"name": "//;s/"//'

# Execute deploy.js for each filtered repository
# Exclude specific repositories and execute deploy.js for the remaining ones
echo "$response" | grep -o '"name": *"[^"]*"' | grep '-' | sed 's/"name": "//;s/"//' | while read -r repo; do
  case "$repo" in
    "Demo-Repo-Translate-Term"|"React-Front-End"|"Node-Back-End"|"marine-term-translations.github.io"|"term-translation-template"|"ldes-sync-harvest-action")
      echo "Skipping repository: $repo"
      ;;
    *)
      echo "Deploying repository: $repo"
      node deploy.js "$repo"
      ;;
  esac
done

# End of script