# SearXNG Copilot Tool

Copilot tool that queries a SearXNG JSON API instance and returns search results for use in Copilot Chat.

## Features

- Adds a Copilot tool named `searxng_search`.
- Queries a SearXNG JSON API endpoint with your query.
- Returns `title`, `url`, `snippet`, and `score` fields, filtered by a configurable score threshold.

## Extension Settings

This extension contributes the following settings:

- `searxngCopilotTool.endpoint`: Your SearXNG JSON API endpoint URL (typically the `/search` endpoint of your instance).
- `searxngCopilotTool.token`: API token sent as an `X-API-Key` header.
- `searxngCopilotTool.scoreThreshold`: Minimum score required to include a result. Set to `0` to include all results.

## Usage

1. Configure the settings above in your VS Code settings.
2. In Copilot Chat, attach the tool with `#searxng_search` and ask your question.

If the endpoint or token is missing, the tool will return an error message instead of results.

## Build and Release

- Local test package: run `pnpm run package` to create a VSIX file in the repo root.
- CI build: the build workflow packages a VSIX artifact on pushes and pull requests.
- Marketplace release: pushing a tag like `v0.1.0` triggers the release workflow.
- Set a GitHub Actions secret named `VSCE_PAT` with your Marketplace PAT.
