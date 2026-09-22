import { getHsTelemetry } from "./contract";

export async function refreshTelemetrySessionJwt(): Promise<string | null> {
  try {
    return (await getHsTelemetry()?.refreshSessionJwt?.()) ?? null;
  } catch {
    return null;
  }
}
