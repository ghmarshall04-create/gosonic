import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = {
  SONICBLAST_PROJECT_REFERENCE: "0x018ea8d2f38f696b2d201a01e5cd04f6272742b7",
  LAUNCH_EXECUTION_MODE: "direct-wallet-scripts",
  ASSETS: { fetch: async () => new Response("asset") },
  LAUNCH_REGISTRY: {
    idFromName: () => "registry",
    get: () => ({ fetch: async () => new Response(JSON.stringify({ creations: [] }), { headers: { "content-type": "application/json" } }) })
  }
};

test("health endpoint returns project metadata", async () => {
  const response = await worker.fetch(new Request("https://sonicblast.example/api/health"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.execution, "direct-wallet-scripts");
});

test("retired chain-action API endpoints are unavailable", async () => {
  const response = await worker.fetch(new Request("https://sonicblast.example/api/launch-intents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chain: "base",
      name: "Midnight Signal",
      symbol: "SIGNAL",
      supply: "1000000",
      decimals: "18",
      liquidityAmount: "0.5",
      quoteAsset: "ETH",
      ownerAddress: "0x1111111111111111111111111111111111111111"
    })
  }), env);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.match(body.error, /not found/i);
});


test("creation board request is forwarded to the registry durable object", async () => {
  const response = await worker.fetch(new Request("https://sonicblast.example/api/creations"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.creations, []);
});

test("rtc config exposes no credentials without configured TURN", async () => {
  const response = await worker.fetch(new Request("https://sonicblast.example/api/rtc-config?peer=3f5f0f5c-9825-4f34-8273-687c3c39385b"), env);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).iceServers, []);
});


