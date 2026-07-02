#!/usr/bin/env node
import { main } from "@earendil-works/pi-coding-agent";
import registerAllAddon from "./addon/index.js";
import { registerAllBuiltin } from "./buildin/index.js";

const { extensions: addonExtensions } = registerAllAddon();
const { extensions: builtinExtensions } = registerAllBuiltin(process.cwd());

await main(process.argv.slice(2), {
  extensionFactories: [...addonExtensions, ...builtinExtensions]
});
