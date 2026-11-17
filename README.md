# freezeledger

Which wallets has a stablecoin issuer blacklisted or frozen, and how big is the record? freezeledger is a local forwarding client for the hosted eaglevirtual stablecoin-freeze-tracker MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the service, returning the answers exactly as the service sends them back.

All six tools read one published register — recorded stablecoin blacklistings, freezes, seizures and releases — and return the register records themselves: which issuer acted, on which blockchain, on what date, and in which transaction and block. The address lookup returns a dated record of what an issuer did, never a risk score, rating, or opinion about an address or its owner. There is no scoring, identity resolution, signup, or send tool in this surface.

## The tools

- **`get_address_status`** — Every recorded action against one wallet `address` (required): which issuer took it, on which blockchain, on what date, and in which transaction and block.
- **`get_token_statistics`** — Counts of recorded blacklistings, freezes and seizures, optionally filtered by `token` and `chain`, broken down by `group_by` (token, chain, month, year, or overall); `limit` caps the by-coin breakdown (default 20). No required parameters.
- **`get_token_policy`** — For a `token` (optional), which restriction controls the issuer has actually used — blacklisting, freezing, taking a balance, lifting a restriction — with counts and first/most recent dates. No required parameters.
- **`get_coverage`** — Which blockchains and coins the record covers, how current it is, and which blockchains are behind right now. No parameters.
- **`list_freeze_events`** — The published feed of recent blacklist, freeze, seizure, release and on-chain sanctions events, filterable by `token`, `chain`, `kind`, `since`, or one whole `month`; `limit` caps rows (default 25). No required parameters.
- **`get_biggest`** — The largest recorded blacklistings, freezes, seizures and releases ranked by amount, filterable by `token`, `chain` and `kind`; `scope` is `recent` (default) or `all_time`, and `limit` caps rows (default 10). No required parameters.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/freezeledger mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "freezeledger": {
      "command": "npx",
      "args": ["-y", "@reneturcios/freezeledger", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/freezeledger
docker run --rm ghcr.io/cloudcorprecords/freezeledger get_coverage '{}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
freezeledger get_address_status '{"address":"0x000000000000000000000000000000000000dead"}'
freezeledger get_token_statistics '{"group_by":"chain"}'
freezeledger get_token_policy '{"token":"USDT"}'
freezeledger get_coverage '{}'
freezeledger list_freeze_events '{"token":"USDT","limit":10}'
freezeledger get_biggest '{"scope":"all_time"}'
freezeledger --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `EAGLEVIRTUAL_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://mcp.eaglevirtual.com/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `freezeledger error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 6 tools, deep-equal, in order, titles served verbatim, and no `required` key added to the five tools that carry none), exercises the session handshake and its reuse, verifies that no `Authorization` or `X-API-Key` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
