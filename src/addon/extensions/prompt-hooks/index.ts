import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import promptHookExtension from './prompt-hooks.js';

// Extension wrapper (re-export default function)
export default promptHookExtension;

// Re-export for programmatic access if needed
export { promptHookExtension };

// Prompt registry layer (built-in templates)
export {
  getBuiltinPrompt,
  getAllBuiltinPrompts,
  registerBuiltinPrompt,
  hasBuiltinPrompt,
  defaultAssistantPrompt,
  codeReviewPrompt,
} from './prompts/index.js';

