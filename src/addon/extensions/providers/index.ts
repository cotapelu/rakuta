/**
 * Provider Module Index
 *
 * Re-export all provider registration functions.
 */

export { registerKiloProvider } from "./kilo-provider.js";
export { registerOfmProvider } from "./ofm-provider-provider.js";

// Provider codegen configuration (consumed by scripts/generate-custom-models.ts)
export { CUSTOM_PROVIDERS } from "./registry.js";

// Model catalog layer
export { getProviderModels, KILO_MODELS, KILO_MODELS_ALL } from "./models/index.js";
