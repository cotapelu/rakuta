/**
 * Tools Index - Unified
 * Re-exports all custom tools for registration
 */

// Core tools (from tau/evo)
export { registerTodosTool } from "./todos-tool.js";
export { registerMemoryTool } from "./memory-tool.js";
export { registerSubToolLoaderExtension } from "./subtool-loader.js";
export { registerToolTemplate } from "./tool-template.js";
export { registerSkillReaderExtension } from "./skill-reader.js";

// JF-specific tools (from tools/)
export { compactContextTool as registerCompactionTool } from "../../../tools/compaction/index.js";
export { codebaseIndexTool as registerCodebaseIndexTool } from "../../../tools/indexer/index.js";
export { skillTool as registerSkillTool } from "../../../tools/skills/index.js";
export { getTimeTool as registerTimeTool } from "../../../tools/time/index.js";
export { registerBashAction } from "./bash-actions.js";

// Session tool (JF comprehensive version)
export { registerJFSessionTool } from "../../../tools/session/index.js";
