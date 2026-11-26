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

// JF-specific tools (migrated from addon/tools/)
export { compactContextTool as registerCompactionTool } from "./compaction/index.js";
export { codebaseIndexTool as registerCodebaseIndexTool } from "./indexer/index.js";
export { skillTool as registerSkillTool } from "./skills/index.js";
export { getTimeTool as registerTimeTool } from "./time/index.js";
export { registerBashAction } from "./bash-actions.js";

// Sub-tool layer (structured file/network operations behind subtool_loader)
export { httpSchema, executeHttp, lsSchema, executeLs, findSchema, executeFind, grepSchema, executeGrep, readSchema, executeRead } from "./sub-tools/index.js";

// Shared tool utilities (path safety, circuit breaker)
export { resolveSecurePath, CircuitBreaker } from "./utils/index.js";

// Session tool (JF comprehensive version - from addon)
export { default as registerJFSessionTool } from "../session-tool/index.js";
