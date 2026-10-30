#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [chain, key] = process.argv.slice(2);
const networks = JSON.parse(readFileSync(resolve(root, "config/networks.json"), "utf8"));
if (!networks[chain] || !key || !(key in networks[chain])) process.exit(1);
process.stdout.write(String(networks[chain][key]));
