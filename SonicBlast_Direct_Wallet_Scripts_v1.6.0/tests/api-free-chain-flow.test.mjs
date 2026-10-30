import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("chain actions do not call a Worker quote or launch-plan API", () => {
  const app = read("public/app.js");
  const worker = read("src/worker.js");
  const scripts = read("public/chain-scripts.js");
  assert.doesNotMatch(app, /\/api\/(?:snbl\/quote|wallet-config|launch-intents|launch-insights)/);
  assert.doesNotMatch(worker, /api\.0x\.org|ZEROX_API_KEY|snbl\/quote|wallet-config/);
  assert.doesNotMatch(scripts, /fetch\s*\(|https?:\/\//);
  assert.match(app, /wallet\.callEvm/);
  assert.match(scripts, /getAmountsOut/);
});
