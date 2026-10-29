// Ambient declarations for Deno and Supabase Edge Functions in IDE TypeScript server

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
    [key: string]: any;
  }
  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { port: number; hostname: string }) => void;
    [key: string]: any;
  }

  export function serve(
    handler: (req: Request) => Promise<Response> | Response
  ): void;
  export function serve(
    options: ServeOptions,
    handler: (req: Request) => Promise<Response> | Response
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.8" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/@supabase/supabase-js@*" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/*" {
  const content: any;
  export default content;
  export * from "@supabase/supabase-js";
}

declare module "https://*" {
  const content: any;
  export default content;
}

declare module "jsr:@supabase/functions-js/*" {
  const content: any;
  export default content;
}
