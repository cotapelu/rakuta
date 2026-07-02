import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createSessionTool } from "../../tools/session/index.js";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    // Just register the tool; initialization happens on first use
    pi.registerTool(createSessionTool());
  });
}
