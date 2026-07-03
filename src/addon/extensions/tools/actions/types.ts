export interface Action {
  execute: (args: any, cwd: string, signal?: AbortSignal, ctx?: any) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    details?: any;
    isError?: boolean;
  }>;
  getParameters?: () => any;
  description?: string;
}
