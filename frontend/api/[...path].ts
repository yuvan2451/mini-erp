import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const path = Array.isArray(req.query.path)
      ? req.query.path.join("/")
      : req.query.path || "";

    const backendUrl = `http://16.171.9.131/api/${path}`;

    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : JSON.stringify(req.body),
    });

    const text = await response.text();

    res.status(response.status);

    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (error) {
    console.error("API proxy error:", error);

    res.status(500).json({
      message: "API proxy error",
    });
  }
}