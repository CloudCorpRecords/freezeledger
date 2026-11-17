# BUILD REPORT — freezeledger

Clean-room rebuild of `eaglevirtual/stablecoin-freeze-tracker`
v1.1.4 (remote-only MCP server at
`https://mcp.eaglevirtual.com/mcp`), built 2026-10-28
as a forwarding client. Package: `@reneturcios/freezeledger`
0.1.0, registry name `io.github.CloudCorpRecords/freezeledger`.

## Surface built

Full surface: **6 of 6 captured tools built**, none omitted.

| Tool | Required fields as served |
|------|---------------------------|
| `get_address_status` | `address` |
| `get_token_statistics` | NO `required` key in the fixture — served verbatim, none invented |
| `get_token_policy` | NO `required` key in the fixture — served verbatim, none invented |
| `get_coverage` | NO `required` key in the fixture — served verbatim, none invented |
| `list_freeze_events` | NO `required` key in the fixture — served verbatim, none invented |
| `get_biggest` | NO `required` key in the fixture — served verbatim, none invented |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: the capture
carries a `title` on every tool, served verbatim. The tool
literals were generated programmatically from
`harness/fixtures/eaglevirtual-tools.json` by the script at
`/tmp/b49-freezeledger-scratch/gen.py` (parse + re-serialise;
the generator's round-trip assertion confirmed the literals
parse back to the fixture's tool objects, and a splice-time
check confirmed the `TOOL_DEFS` block in `src/forward.ts`
deep-equals the fixture's 6 tool objects) — never retyped —
and the registration-integrity test suite plus the parity
harness confirmed the served literals deep-equal the
fixture's 6 tool objects, in order. Tools are registered
via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema`
handlers), not McpServer+zod.

## Fixture conflicts

**None.** The spec and the fixture agree on all 6 tools'
names, titles, descriptions, required fields (including the
five tools with no `required` key: `get_token_statistics`,
`get_token_policy`, `get_coverage`, `list_freeze_events`,
`get_biggest`, and `get_address_status` requiring `address`)
and property shapes. The spec's note that the capture
carries `title` keys matches the fixture exactly.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://mcp.eaglevirtual.com/mcp`.
- Env override `EAGLEVIRTUAL_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no
  auth header is ever sent. Tests assert that no
  `Authorization` header is sent under any environment —
  including with key-like env vars (`EAGLEVIRTUAL_API_KEY`,
  `API_KEY`, `AUTHORIZATION`) set — and that no `X-API-Key`
  header is ever sent; upstream requests carry only
  `Content-Type`, `Accept` and, when issued, `Mcp-Session-Id`.
- Error rendering `freezeledger error:` text for upstream
  failures — labelled reconstruction.
- Upstream results pass through verbatim, including `isError`
  and extra fields (content, structuredContent and any
  additional fields preserved). tools/call is forwarded as
  streamable-HTTP JSON-RPC: initialize (protocolVersion
  `2025-03-26`) → notifications/initialized → tools/call,
  honouring `Mcp-Session-Id` when issued; plain-JSON and SSE
  replies are both parsed. The forwarding core takes an
  injectable fetch; tests stub the upstream — no live
  network calls in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3).
- Parses as JSON; `name` == `@reneturcios/freezeledger`.
- Package entries: **128**.
- sha256: `fe3cbbfe1f184d4de6b998045071a67527cc7ecc83e1738314ba3001a929f0e0`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "Published stablecoin freeze record: blacklist, freeze and seizure events, policies and statistics." —
  **98 characters** (verified programmatically, ≤100).
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/freezeledger:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio.
  Dockerfile (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/freezeledger"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/freezeledger`
  and its smoke test asserts the server name `freezeledger`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **56 tests, 56 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 6
   tools, including the verbatim-title assertions and the
   required-key exactness assertions — get_address_status requires
   address, the other five have NO required key — plus session
   handling/reuse, env override, the no-Authorization-header
   assertions under any environment, verbatim argument forwarding
   and result pass-through including structuredContent and
   upstream isError, SSE parsing, error rendering, MCP-layer
   validation, and CLI behaviour including a tool subcommand
   forwarding test against a local stub server).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/eaglevirtual-tools.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/freezeledger/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/freezeledger/parity-out` → **verdict PASS, parity 100.0**
   (6/6 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
