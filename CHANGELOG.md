# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted eaglevirtual stablecoin-freeze-tracker MCP server. All 6 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `get_address_status`, `get_token_statistics`, `get_token_policy`, `get_coverage`, `list_freeze_events`, `get_biggest`. The capture carries a `title` on every tool, served verbatim; only `get_address_status` carries a `required` key in the capture (`address`) and the other five tools are served with no `required` key, exactly as captured.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `freezeledger error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `EAGLEVIRTUAL_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
