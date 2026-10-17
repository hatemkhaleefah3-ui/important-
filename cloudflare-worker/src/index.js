export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowedOrigin = new URL(env.APP_URL).origin;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }

    if (url.pathname === "/api/links") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin, allowedOrigin);
      if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed" }, 403, origin, allowedOrigin);

      let body;
      try {
        const length = Number(request.headers.get("Content-Length") || 0);
        if (length > 2_000_000) return json({ error: "Lecture payload is too large" }, 413, origin, allowedOrigin);
        body = await request.json();
      } catch {
        return json({ error: "Expected a JSON request body" }, 400, origin, allowedOrigin);
      }

      const lecture = body?.lecture;
      if (!lecture || typeof lecture !== "object" || typeof lecture.title !== "string" ||
          !Array.isArray(lecture.blocks) || lecture.blocks.length === 0) {
        return json({ error: "Invalid lecture payload" }, 400, origin, allowedOrigin);
      }

      const serialized = JSON.stringify(lecture);
      if (new TextEncoder().encode(serialized).byteLength > 1_900_000) {
        return json({ error: "Lecture payload exceeds the storage limit" }, 413, origin, allowedOrigin);
      }

      for (let attempt = 0; attempt < 4; attempt++) {
        const code = makeCode();
        const key = `links/${code}.json`;
        const existing = await env.LECTURE_LINKS.get(key);
        if (existing) continue;
        await env.LECTURE_LINKS.put(key, serialized, {
          httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "public, max-age=300" },
          customMetadata: { createdAt: new Date().toISOString() }
        });
        return json({ code, shortUrl: `${url.origin}/${code}` }, 201, origin, allowedOrigin);
      }
      return json({ error: "Could not allocate a unique short code; retry" }, 503, origin, allowedOrigin);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const code = url.pathname.slice(1);
    if (!/^[A-Za-z0-9_-]{7,12}$/.test(code)) return new Response("Short link not found", { status: 404 });
    const object = await env.LECTURE_LINKS.get(`links/${code}.json`);
    if (!object) return new Response("Short link not found", { status: 404 });

    let lecture;
    try {
      lecture = await object.json();
    } catch {
      return new Response("Stored lecture is invalid", { status: 500 });
    }
    const destination = new URL(env.APP_URL);
    destination.hash = `lecture=${encodeLecture(lecture)}`;
    if (url.searchParams.get("view") === "exam") destination.searchParams.set("view", "exam");
    return Response.redirect(destination.toString(), 302);
  }
};

function makeCode() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}

function encodeLecture(lecture) {
  const bytes = new TextEncoder().encode(JSON.stringify(lecture));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function corsHeaders(origin, allowedOrigin) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400"
  });
  if (origin === allowedOrigin) headers.set("Access-Control-Allow-Origin", allowedOrigin);
  return headers;
}

function json(data, status, origin, allowedOrigin) {
  const headers = corsHeaders(origin, allowedOrigin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}
