import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  if (!req.headers.get("accept")?.includes("text/markdown")) {
    return;
  }

  const { pathname } = new URL(req.url);
  const mdPath = pathname.endsWith(".md") ? pathname : `${pathname}.md`;

  const rewritten = await context.rewrite(mdPath);

  return new Response(rewritten.body, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
};

export const config: Config = {
  path: "/*",
  excludedPath: ["/api/*", "/css/*", "/js/*", "/images/*", "/fonts/*"],
}; 
