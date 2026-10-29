# Deploy SonicBlast Smart Launcher

## First deployment

From the repository root:

```bash
npm install
npm run verify
npx wrangler login
npm run deploy
```

Wrangler prints the Worker URL after a successful deployment. Add a custom domain from the Cloudflare Worker dashboard when the app is ready to use its final address.

## Git-connected deployments

Connect the GitHub repository to **Workers & Pages → Create application → Workers**.

Use these settings:

| Field | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run verify` |
| Deploy command | `npm run deploy` |

The root contains `package.json`, `wrangler.jsonc`, the Worker, and the PWA assets. The supplied Worker name is `sonicblast-smart-launcher`; change that one value before deployment only if your Cloudflare account needs a different Worker name. This avoids the missing `package.json` build failure from the earlier nested package.

## Durable Object migrations

The first production deploy creates two SQLite-backed Durable Object classes:

- `ChatRoom` for persistent chat history, room presence, and WebRTC signaling.
- `LaunchRegistry` for the ranked creation board and community heat totals.

Keep the existing migration tags (`v1`, `v2`) in version control. If a production schema changes later, add a new migration tag instead of editing an existing one.

## SNBL market configuration

Set the non-secret Worker variable `SNBL_BUY_URL` to the approved HTTPS market page for SNBL. The bright **Buy SNBL** button uses only this configured link. Do not add a recovery phrase, private key, or wallet credential to this variable.

## Voice and video configuration

WebRTC media travels directly between participants. SonicBlast uses the room Durable Object only to exchange WebRTC offers, answers, and ICE candidates.

For a production call path, configure an operator-controlled STUN/TURN deployment:

1. Add an optional Worker variable named `RTC_ICE_SERVERS_JSON` with a JSON array containing only STUN servers. For example:

   ```json
   [{"urls":["stun:stun.example.com:3478"]}]
   ```

2. If the TURN service supports the shared-secret TURN REST method, add a Worker variable named `TURN_URLS`:

   ```json
   ["turn:turn.example.com:3478?transport=udp","turns:turn.example.com:5349"]
   ```

3. Add the related shared secret with Wrangler. Do not place it in `wrangler.jsonc`, the browser app, or Git:

   ```bash
   npx wrangler secret put TURN_SHARED_SECRET
   ```

The Worker produces a 15-minute TURN credential for each room participant. With no TURN settings, direct calls may still work, but a relay is needed for the strongest cross-network reliability.

## Post-deploy checks

1. Open the Worker URL and verify the creation board loads.
2. Complete the launch popup with a test public address. Confirm Sonic IQ shows the chain, liquidity lane, and local next action, then confirm the downloaded runner file contains no secret value.
3. Publish a planned creation; confirm it appears on the board.
4. Add a test deployed address and HTTPS market URL; confirm the card renders a Buy link and that it opens only the supplied market URL.
5. Open the same Sonic room from a second browser profile, send messages both ways, and test voice then video permissions.
6. Use the Install button to install the PWA.

## Launch workstation

The runner is not part of the public deployment. Configure it on an operator-controlled machine, then use its generated handoff to create contracts and liquidity transactions. Review [runner/README.md](runner/README.md) before executing a mainnet command.
