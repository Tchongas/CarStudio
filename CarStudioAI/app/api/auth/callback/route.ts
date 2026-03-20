import { handleHubCallback } from "@/lib/auth/hub-callback";

export async function GET(request: Request) {
  return await handleHubCallback(request);
}
