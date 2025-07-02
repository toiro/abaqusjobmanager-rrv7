# MCP 環境構築

## Playwright

```
claude mcp add playwright npx @playwright/mcp@latest
```

```
      "mcpServers": {
        "playwright": {
          "type": "stdio",
          "command": "npx",
          "args": [
            "@playwright/mcp@latest",
            "--config", // **追加する**
            "/app/.devcontainer/mcp/playwright-config.json" // **追加する**
          ],
          "env": {}
        }
      },
```
