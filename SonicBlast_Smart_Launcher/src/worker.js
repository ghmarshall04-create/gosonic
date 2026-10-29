import { buildLaunchIntelligence, buildLaunchPlan, PROJECT_REFERENCE } from "./launch-plan.js";
import { cleanHandle, cleanPeerId, cleanRoomId, creationFromRow, normalizeCreationInput } from "./creations.js";

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function requestJson(request, maxBytes = 16_384) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error("Request body is too large.");
  const body = await request.text();
  if (body.length > maxBytes) throw new Error("Request body is too large.");
  try { return body ? JSON.parse(body) : {}; } catch { throw new Error("Request body must be valid JSON."); }
}

function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; connect-src 'self' wss:; img-src 'self' data:; media-src 'self' blob:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function publicHttpsUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch { return ""; }
}

function parseIceServers(raw) {
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, 6).flatMap((entry) => {
      const urls = Array.isArray(entry?.urls) ? entry.urls : [entry?.urls];
      const validUrls = urls.filter((url) => typeof url === "string" && /^stuns?:/i.test(url));
      return validUrls.length ? [{ urls: validUrls }] : [];
    });
  } catch { return []; }
}

function parseTurnUrls(raw) {
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.filter((url) => typeof url === "string" && /^turns?:/i.test(url)).slice(0, 6);
  } catch { return []; }
}

function bytesToBase64(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

async function capabilityHash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildRtcConfig(env, peerId) {
  const iceServers = parseIceServers(env.RTC_ICE_SERVERS_JSON);
  const turnUrls = parseTurnUrls(env.TURN_URLS);
  const turnSecret = String(env.TURN_SHARED_SECRET || "");
  if (turnUrls.length && turnSecret) {
    const expiry = Math.floor(Date.now() / 1_000) + 900;
    const username = `${expiry}:${peerId}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(turnSecret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username));
    iceServers.push({ urls: turnUrls, username, credential: bytesToBase64(new Uint8Array(signature)) });
  }
  return { iceServers };
}

function validSignal(signal) {
  if (!signal || typeof signal !== "object") return false;
  const serialized = JSON.stringify(signal);
  if (serialized.length > 12_000) return false;
  if (signal.description) {
    return typeof signal.description === "object"
      && ["offer", "answer", "rollback"].includes(signal.description.type)
      && typeof signal.description.sdp === "string"
      && signal.description.sdp.length <= 10_000;
  }
  if (signal.candidate) {
    return typeof signal.candidate === "object"
      && typeof signal.candidate.candidate === "string"
      && signal.candidate.candidate.length <= 4_000;
  }
  return false;
}

function errorStatus(message) {
  if (/cannot manage/i.test(message)) return 403;
  if (/not found/i.test(message)) return 404;
  return /supported|valid|must|greater|choose|enter|too large|complete|before publishing/i.test(message) ? 400 : 500;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return securityHeaders(json({
          ok: true,
          projectReference: env.SONICBLAST_PROJECT_REFERENCE || PROJECT_REFERENCE,
          runner: env.LAUNCH_RUNNER_MODE || "local",
          rooms: "durable-object",
          calls: "webrtc"
        }));
      }

      if (request.method === "GET" && url.pathname === "/api/market-config") {
        return securityHeaders(json({ snblBuyUrl: publicHttpsUrl(env.SNBL_BUY_URL) }));
      }

      if (request.method === "GET" && url.pathname === "/api/rtc-config") {
        const peerId = cleanPeerId(url.searchParams.get("peer"));
        return securityHeaders(json(await buildRtcConfig(env, peerId)));
      }

      if (request.method === "POST" && url.pathname === "/api/launch-intents") {
        const input = await requestJson(request);
        return securityHeaders(json(buildLaunchPlan(input), 201));
      }

      if (request.method === "POST" && url.pathname === "/api/launch-insights") {
        const input = await requestJson(request);
        return securityHeaders(json(buildLaunchIntelligence(input)));
      }

      if (request.method === "POST" && url.pathname === "/api/rooms") {
        const body = await requestJson(request, 2_048);
        const requested = cleanRoomId(body.room);
        const room = requested || `blast-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
        return securityHeaders(json({ room, url: `${url.origin}/#room=${encodeURIComponent(room)}` }, 201));
      }

      if (url.pathname === "/api/creations" || /^\/api\/creations\/sb_[a-f0-9]{32}(?:\/pulse)?$/.test(url.pathname)) {
        if (!env.LAUNCH_REGISTRY) throw new Error("Launch registry binding is unavailable.");
        const id = env.LAUNCH_REGISTRY.idFromName("sonicblast:creations");
        return securityHeaders(await env.LAUNCH_REGISTRY.get(id).fetch(request));
      }

      if (url.pathname.startsWith("/ws/rooms/")) {
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
          return securityHeaders(json({ error: "WebSocket upgrade required." }, 426));
        }
        const room = cleanRoomId(decodeURIComponent(url.pathname.slice("/ws/rooms/".length)));
        if (!room) return securityHeaders(json({ error: "Room id is invalid." }, 400));
        const id = env.CHAT_ROOM.idFromName(`sonicblast:${room}`);
        return env.CHAT_ROOM.get(id).fetch(request);
      }

      return securityHeaders(await env.ASSETS.fetch(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      return securityHeaders(json({ error: message }, errorStatus(message)));
    }
  }
};

export class LaunchRegistry {
  constructor(state) {
    this.state = state;
    this.ready = this.state.blockConcurrencyWhile(async () => {
      this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS creations (
          id TEXT PRIMARY KEY,
          chain TEXT NOT NULL,
          chain_label TEXT NOT NULL,
          name TEXT NOT NULL,
          symbol TEXT NOT NULL,
          supply TEXT NOT NULL,
          decimals INTEGER NOT NULL,
          owner_address TEXT NOT NULL,
          liquidity_amount TEXT NOT NULL,
          quote_asset TEXT NOT NULL,
          room TEXT NOT NULL,
          token_address TEXT NOT NULL DEFAULT '',
          buy_url TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL,
          manage_token_hash TEXT NOT NULL DEFAULT '',
          heat INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
      `);
      const columns = Array.from(this.state.storage.sql.exec("PRAGMA table_info(creations);"));
      if (!columns.some((column) => column.name === "manage_token_hash")) {
        this.state.storage.sql.exec("ALTER TABLE creations ADD COLUMN manage_token_hash TEXT NOT NULL DEFAULT '';" );
      }
    });
  }

  rows(limit = 36) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 36, 100));
    return Array.from(this.state.storage.sql.exec(
      "SELECT id, chain, chain_label, name, symbol, supply, decimals, owner_address, liquidity_amount, quote_asset, room, token_address, buy_url, status, heat, created_at FROM creations ORDER BY heat DESC, created_at DESC LIMIT ?;",
      safeLimit
    )).map(creationFromRow);
  }

  raw(id) {
    return Array.from(this.state.storage.sql.exec(
      "SELECT id, chain, chain_label, name, symbol, supply, decimals, owner_address, liquidity_amount, quote_asset, room, token_address, buy_url, status, manage_token_hash, heat, created_at FROM creations WHERE id = ? LIMIT 1;",
      id
    ))[0] || null;
  }

  find(id) {
    const row = this.raw(id);
    return row ? creationFromRow(row) : null;
  }

  async create(input) {
    const creation = normalizeCreationInput(input);
    const id = `sb_${crypto.randomUUID().replaceAll("-", "")}`;
    const managementToken = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const room = creation.room || `launch-${creation.symbol.toLowerCase()}-${id.slice(-6)}`;
    const createdAt = Date.now();
    this.state.storage.sql.exec(
      "INSERT INTO creations (id, chain, chain_label, name, symbol, supply, decimals, owner_address, liquidity_amount, quote_asset, room, token_address, buy_url, status, manage_token_hash, heat, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);",
      id,
      creation.chain,
      creation.chainLabel,
      creation.name,
      creation.symbol,
      creation.supply,
      creation.decimals,
      creation.ownerAddress,
      creation.liquidityAmount,
      creation.quoteAsset,
      room,
      creation.tokenAddress,
      creation.buyUrl,
      creation.status,
      await capabilityHash(managementToken),
      createdAt
    );
    return { creation: this.find(id), managementToken };
  }

  async update(id, managementToken, input) {
    const existing = this.raw(id);
    if (!existing) throw new Error("Creation not found.");
    if (!managementToken || await capabilityHash(managementToken) !== existing.manage_token_hash) {
      throw new Error("This browser cannot manage that creation.");
    }
    const creation = normalizeCreationInput({
      chain: existing.chain,
      name: existing.name,
      symbol: existing.symbol,
      supply: existing.supply,
      decimals: existing.decimals,
      ownerAddress: existing.owner_address,
      liquidityAmount: existing.liquidity_amount,
      quoteAsset: existing.quote_asset,
      room: String(input.room ?? existing.room).trim() || existing.room,
      tokenAddress: input.tokenAddress ?? existing.token_address,
      buyUrl: input.buyUrl ?? existing.buy_url
    });
    const room = creation.room || existing.room;
    this.state.storage.sql.exec(
      "UPDATE creations SET room = ?, token_address = ?, buy_url = ?, status = ? WHERE id = ?;",
      room,
      creation.tokenAddress,
      creation.buyUrl,
      creation.status,
      id
    );
    return this.find(id);
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/api/creations") {
        return json({ creations: this.rows(url.searchParams.get("limit")) });
      }
      if (request.method === "POST" && url.pathname === "/api/creations") {
        const body = await requestJson(request, 8_192);
        const result = await this.create(body);
        return json(result, 201);
      }
      const updateMatch = url.pathname.match(/^\/api\/creations\/(sb_[a-f0-9]{32})$/);
      if (request.method === "PATCH" && updateMatch) {
        const body = await requestJson(request, 4_096);
        const managementToken = request.headers.get("x-sonicblast-manage") || "";
        return json({ creation: await this.update(updateMatch[1], managementToken, body) });
      }
      const pulseMatch = url.pathname.match(/^\/api\/creations\/(sb_[a-f0-9]{32})\/pulse$/);
      if (request.method === "POST" && pulseMatch) {
        const existing = this.find(pulseMatch[1]);
        if (!existing) return json({ error: "Creation not found." }, 404);
        this.state.storage.sql.exec("UPDATE creations SET heat = heat + 1 WHERE id = ?;", existing.id);
        return json({ creation: this.find(existing.id) });
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      return json({ error: message }, errorStatus(message));
    }
  }
}

export class ChatRoom {
  constructor(state) {
    this.state = state;
    this.ready = this.state.blockConcurrencyWhile(async () => {
      this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          handle TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
    });
  }

  attachment(socket) {
    const saved = socket.deserializeAttachment() || {};
    return { handle: cleanHandle(saved.handle), peerId: cleanPeerId(saved.peerId), media: ["off", "voice", "video"].includes(saved.media) ? saved.media : "off" };
  }

  participants(excludePeerId = "") {
    return this.state.getWebSockets().map((socket) => {
      const participant = this.attachment(socket);
      return participant;
    }).filter((participant) => participant.peerId !== excludePeerId);
  }

  history() {
    const rows = Array.from(this.state.storage.sql.exec("SELECT id, handle, body, created_at FROM messages ORDER BY id DESC LIMIT 80;")).reverse();
    return rows.map((row) => ({ id: Number(row.id), handle: row.handle, body: row.body, createdAt: Number(row.created_at) }));
  }

  send(socket, event) {
    try { socket.send(JSON.stringify(event)); } catch { /* stale sockets are ignored */ }
  }

  broadcast(event, excludedPeerId = "") {
    for (const socket of this.state.getWebSockets()) {
      const participant = this.attachment(socket);
      if (participant.peerId !== excludedPeerId) this.send(socket, event);
    }
  }

  sendToPeer(peerId, event) {
    for (const socket of this.state.getWebSockets()) {
      if (this.attachment(socket).peerId === peerId) {
        this.send(socket, event);
        return true;
      }
    }
    return false;
  }

  broadcastPresence() {
    this.broadcast({ type: "presence", count: this.state.getWebSockets().length });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    const handle = cleanHandle(url.searchParams.get("handle"));
    const peerId = cleanPeerId(url.searchParams.get("peer"));
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ handle, peerId, media: "off" });
    this.send(server, { type: "history", messages: this.history() });
    this.send(server, { type: "room-state", peers: this.participants(peerId) });
    this.broadcast({ type: "peer-joined", peer: { handle, peerId, media: "off" } }, peerId);
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    await this.ready;
    if (typeof message !== "string" || message.length > 16_000) return;
    let event;
    try { event = JSON.parse(message); } catch { return; }
    const attachment = this.attachment(ws);

    if (event.type === "message") {
      const body = String(event.body ?? "").trim().replace(/\s+/g, " ").slice(0, 1_000);
      if (!body) return;
      const createdAt = Date.now();
      this.state.storage.sql.exec("INSERT INTO messages (handle, body, created_at) VALUES (?, ?, ?);", attachment.handle, body, createdAt);
      this.state.storage.sql.exec("DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 250);");
      this.broadcast({ type: "message", handle: attachment.handle, body, createdAt });
      return;
    }

    if (event.type === "media-state" && ["off", "voice", "video"].includes(event.mode)) {
      const next = { ...attachment, media: event.mode };
      ws.serializeAttachment(next);
      this.broadcast({ type: "media-state", peer: next });
      return;
    }

    if (event.type === "signal") {
      const target = cleanPeerId(event.target);
      if (target === attachment.peerId || !validSignal(event.signal)) return;
      this.sendToPeer(target, { type: "signal", from: attachment.peerId, signal: event.signal });
    }
  }

  webSocketClose(ws, code, reason) {
    const attachment = this.attachment(ws);
    try { ws.close(code, reason); } catch { /* connection is already closed */ }
    this.broadcast({ type: "peer-left", peerId: attachment.peerId });
    this.broadcastPresence();
  }
}
