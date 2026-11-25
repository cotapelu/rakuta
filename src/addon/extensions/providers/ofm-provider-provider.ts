import ofmProviderExtension from "./ofm-provider/index.js";

export { ofmProviderExtension };

export async function registerOfmProvider(api: any): Promise<void> {
  await ofmProviderExtension(api);
}

export default ofmProviderExtension;
