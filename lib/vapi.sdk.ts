import Vapi from "@vapi-ai/web";

class NoopVapi {
  on() {}
  off() {}
  stop() {}
  async start() {
    const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
    throw new Error(
      token
        ? "Vapi client not initialized. Please refresh the page."
        : "Missing NEXT_PUBLIC_VAPI_WEB_TOKEN. Add it to your .env and restart."
    );
  }
}

const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
export const vapi: any = token ? new Vapi(token) : (new NoopVapi() as any);
