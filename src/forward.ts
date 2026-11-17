/**
 * freezeledger core: a forwarding client for the hosted
 * eaglevirtual MCP server (the stablecoin freeze tracker).
 *
 * Nothing about freezes or seizures is computed here.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured; every tool carries a
 * title, and only get_address_status carries a
 * `required` key -- address -- so no other tool is
 * served with one). A tools/call travels upstream over
 * a streamable-HTTP JSON-RPC session: an initialize
 * POST, a notifications/initialized POST, then the
 * tools/call POST, carrying the Mcp-Session-Id response
 * header on later requests when the upstream issues
 * one. The session opens lazily on the first forwarded
 * call and is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://mcp.eaglevirtual.com/mcp and may be replaced
 * with the EAGLEVIRTUAL_MCP_URL environment variable
 * (that override is a labelled reconstruction). The
 * registry record declares NO headers on the upstream
 * remote, so no auth header is ever sent, under any
 * environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `freezeledger error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://mcp.eaglevirtual.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/eaglevirtual-tools.json; generated      */
/* programmatically by parsing and re-serialising the fixture JSON,    */
/* never retyped). All 6 captured tools are built.                     */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "get_address_status",
    "title": "Check whether a wallet has been blacklisted or frozen",
    "description": "Check one wallet address against the record of stablecoin blacklistings, freezes and seizures. Returns every recorded action against that address — which issuer took it, on which blockchain, on what date, and in which transaction and block, so it can be verified independently. Covers USDT, USDC and every other coin in this record, on every blockchain it checks. Returns a dated record of what an issuer did, never a risk score, rating, or opinion about the address or its owner. Needs no account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "address": {
          "type": "string",
          "description": "The wallet address to check, in any format the chain uses. Accepts Ethereum-style addresses (used by Ethereum and many other chains), addresses on Tron, Solana, Stellar, TON, the XRP Ledger, Aptos, Starknet, Sui and the TX Chain, and NEAR account names that end in .near. An Ethereum-style address works in all small letters, all capitals, or with the capitals the wallet shows. Any other mix of capitals is read as a typo. For every other kind of address, keep the capital and small letters as the wallet shows them.",
          "maxLength": 120,
          "examples": [
            "0x000000000000000000000000000000000000dead",
            "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"
          ]
        }
      },
      "required": [
        "address"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "get_token_statistics",
    "title": "Stablecoin blacklist and freeze statistics",
    "description": "Counts of recorded stablecoin blacklistings, freezes and seizures — by coin, by blockchain, by month, or by year. Answers questions like \"how many wallets has Tether blacklisted\", \"which coin is frozen most often\", and \"how many seizures happened in 2025\". Returns counts and dates only; no wallet addresses are returned by this tool.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "token": {
          "type": "string",
          "description": "Optional coin ticker, e.g. USDT. A ticker two issuers use returns both coins, each with its issuer. Omit for every coin.",
          "maxLength": 32
        },
        "chain": {
          "type": "string",
          "description": "Optional blockchain name or chain id, e.g. Ethereum or 1.",
          "maxLength": 32
        },
        "group_by": {
          "type": "string",
          "enum": [
            "token",
            "chain",
            "month",
            "year",
            "overall"
          ],
          "description": "Which breakdown to return. Defaults to token."
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 200,
          "description": "How many coins the by-coin breakdown returns, the coins with the most recorded events first. Defaults to 20, up to 200. The totals count every coin whatever the limit. The other breakdowns are short and are returned whole."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "get_token_policy",
    "title": "Which blacklist and freeze controls a stablecoin issuer has used",
    "description": "For a given coin, the record of which restriction controls the issuer has actually used — blacklisting, freezing, taking a balance, lifting a restriction — with the on-chain event signature, how many times, and the first and most recent dates. Reports what has happened, dated. It does not report what a contract is capable of: contract capability inspection is not published yet, and this tool says so rather than inferring that a coin cannot freeze from an absence of records. Discloses no wallets.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "token": {
          "type": "string",
          "description": "Coin ticker, e.g. USDT, USDC, EURC. A ticker two issuers use returns both coins, each with its issuer. Omit for every coin on record.",
          "maxLength": 32
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "get_coverage",
    "title": "Which blockchains and stablecoins are covered, and how current",
    "description": "The blockchains and coins covered by this stablecoin blacklist and freeze record, the date of the most recent recorded event, and which blockchains have records that are behind right now, so we cannot vouch for them. Call this to find out whether a chain or coin is in scope before relying on an answer about it, and to check whether any part of the record is behind. `chains_claimed`, `coins_covered`, `contracts_checked` and `companies_checked` are what a check covers; the `coins` array lists only the coins that have at least one recorded event, which is a smaller set. A coin is one name run by one issuer, so a name that two issuers use appears once per issuer, with the issuer after it.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  },
  {
    "name": "list_freeze_events",
    "title": "Recent stablecoin blacklistings and freezes",
    "description": "The published feed of recent stablecoin blacklist, freeze, seizure, release and on-chain sanctions events, the same rows eaglevirtual.com shows publicly, with the wallet, coin, blockchain, date, block and transaction for each. Covers every coin on every chain: omit the filters and it returns all of them, newest first. Filter by coin, blockchain, event kind or date to narrow it. This is a published sample of the record, not the full corpus, and there is no way to page beyond it. Add month (YYYY-MM) for one whole recorded month: every caller gets the month’s totals, and the events behind them need a paid account. To check a specific wallet, use get_address_status; for totals use get_token_statistics.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "token": {
          "type": "string",
          "description": "Coin symbol, e.g. USDT.",
          "maxLength": 32
        },
        "chain": {
          "type": "string",
          "description": "Blockchain name or chain id, e.g. Tron or 1.",
          "maxLength": 32
        },
        "kind": {
          "type": "string",
          "enum": [
            "blacklist",
            "freeze",
            "seizure",
            "release",
            "sanctions",
            "delisting"
          ],
          "description": "Restrict to one kind of event. \"blacklist\" is a deny-list entry in the token contract; \"freeze\" locks an account; \"seizure\" took the balance; \"release\" lifted a restriction; \"sanctions\" is an on-chain sanctions listing; \"delisting\" removed one. Omit for all."
        },
        "since": {
          "type": "string",
          "description": "Only events on or after this date, YYYY-MM-DD.",
          "maxLength": 10
        },
        "month": {
          "type": "string",
          "pattern": "^\\d{4}-(0[1-9]|1[0-2])$",
          "minLength": 7,
          "maxLength": 7,
          "description": "One whole recorded month, YYYY-MM, instead of the recent feed. Every caller gets the month’s totals; the events behind them need a paid account."
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "Rows to return, up to 100. Defaults to 25."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "get_biggest",
    "title": "Largest recorded stablecoin seizures, freezes and blacklistings",
    "description": "The largest recorded stablecoin blacklistings, freezes, seizures and releases, ranked by amount, largest first. Answers \"what is the largest blacklist\", \"the biggest freeze\", and \"the biggest seizure\". Filter by coin, blockchain or kind. A blacklisting or freeze is ranked by the balance the wallet held when it was restricted; a seizure by the balance that was taken. They are two different quantities and each row says which it is. The default scope ranks the 25 latest recorded events, with the wallet, date, block and transaction for each. Set scope to \"all_time\" for the largest in the whole record, which names no wallet, transaction or block.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "token": {
          "type": "string",
          "description": "Coin symbol, e.g. USDT. Omit for every coin.",
          "maxLength": 32
        },
        "chain": {
          "type": "string",
          "description": "Blockchain name or chain id, e.g. Tron or 1.",
          "maxLength": 32
        },
        "kind": {
          "type": "string",
          "enum": [
            "blacklist",
            "freeze",
            "seizure",
            "release",
            "sanctions"
          ],
          "description": "Restrict to one kind of action. \"blacklist\" is a deny-list entry in the token contract; \"freeze\" locks an account; \"seizure\" took the balance; \"release\" lifted a restriction; \"sanctions\" is an on-chain sanctions listing. Omit for all."
        },
        "scope": {
          "type": "string",
          "enum": [
            "recent",
            "all_time"
          ],
          "description": "Defaults to \"recent\": the 25 latest recorded events, with the wallet, block and transaction on every row. \"all_time\" ranks the whole record from its first event and names no wallet, transaction or block for any of it."
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "description": "Rows to return, up to 50. Defaults to 10."
        }
      },
      "additionalProperties": false
    }
  }
];
export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `freezeledger error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class FreezeledgerClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).EAGLEVIRTUAL_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "freezeledger", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): FreezeledgerClient {
  return new FreezeledgerClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new FreezeledgerClient(deps).callTool(name, args);
}
