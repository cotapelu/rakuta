import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { skillTool } from "../../tools/skills/index.js";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    pi.registerTool(skillTool);
  });
}
