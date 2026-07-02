import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createMultiAgentTool } from "../../tools/multi-agent/index.js";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    pi.registerTool(createMultiAgentTool());
  });
}
