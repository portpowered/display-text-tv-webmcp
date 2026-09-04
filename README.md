# Display Text TV — WebMCP

A static, full-screen TV display controlled through one WebMCP tool: `set_text`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. A compatible browser agent can call `set_text({ "text": "Hello from WebMCP" })`.

Text is plain text, preserves Unicode and newlines, automatically shrinks to fit, and persists across refreshes. Input is capped at 2,000 characters.

## Verify

```bash
npm test
```

## Deployment and releases

Pushes to `main` run CI and deploy the static export to:

<https://portpowered.github.io/display-text-tv-webmcp/>

Semantic-version tags such as `v1.0.0` run the release pipeline. GoReleaser publishes zip and tarball archives of the standalone static site with checksums.
