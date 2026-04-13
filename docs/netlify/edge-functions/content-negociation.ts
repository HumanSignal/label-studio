import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  if (req.headers.get("accept") !== "text/markdown") {
    return;
  }
  const { pathname } = new URL(req.url);
  return new URL(`${pathname}.md`, req.url);
};

export const config: Config = {
  path: "/*",
  excludedPath: ["/api/*", "/assets/*"],
};
