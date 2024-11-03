import { Hono } from "hono";

const BASE_URL = "/comfyui-ghpages";
const COMFY_URL = `${BASE_URL}/comfyui`;
const app = new Hono().basePath(`${COMFY_URL}/`);

declare const self: ServiceWorkerGlobalScope;

app.get("/", async (c) => {
  const response = await fetch(`${COMFY_URL}/index.html`);
  let html = await response.text();
  if (import.meta.env.DEV) {
    html = html.replace(
      "<head>",
      `<head><script type='module' src='${BASE_URL}/src/main.ts'></script>`,
    );
  }
  return c.html(html);
});

app.get("/api/prompt", async (c) => {
  return c.json({
    exec_info: { queue_remaining: 0 },
  });
});
app.post("/api/prompt", async (c) => {
  return c.json(
    {
      error: {
        type: "prompt_outputs_failed_validation",
        message: "Execution not supported.",
        details: "",
        extra_info: {},
      },
      node_errors: {},
    },
    400,
  );
});

app.get("/api/userdata/*", async (c) => {
  return c.json([]);
});

const CACHE_NAME = "image-cache-v1";
app.get("/api/view", async (c) => {
  const filename = c.req.query("filename");
  if (!filename || filename.includes("..")) {
    return c.text("Not Found", { status: 404 });
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(`/images/${filename}`);

    if (!cachedResponse) {
      return new Response("Image not found", { status: 404 });
    }

    // Clone the response before returning it
    return cachedResponse.clone();
  } catch (error) {
    c.text("image not found", 404);
  }
});
app.get("/api/extensions", async (c) => {
  const ext = await fetch(`${BASE_URL}/api/extensions.json`);
  const extensions = (await ext.json()) as unknown as string[];
  extensions.push("/extensions/playground.js");
  return c.json(extensions);
});

app.get("/api/*", async (c) => {
  let pathName = new URL(c.req.url).pathname;
  pathName = pathName.replace(`${COMFY_URL}/api`, `${BASE_URL}/api`) + ".json";
  const response = await fetch(pathName);
  if (response.ok) return response;
  return c.text("Not found", 404);
});
app.get("/extensions/*", async (c) => {
  let pathName = new URL(c.req.url).pathname;
  pathName = pathName.replace(`${COMFY_URL}/`, `${BASE_URL}/`);
  const response = await fetch(pathName);
  if (response.ok) return response;
  return c.text("Not found", 404);
});

app.get("/scripts/*", async (c) => {
  let pathName = new URL(c.req.url).pathname;
  const response = await fetch(COMFY_URL + pathName);
  if (response.ok) return response;
  return c.text("Not found", 404);
});
app.post("/api/upload/image", async (c) => {
  const body = await c.req.formData();
  const file = body.get("image") as File;
  if (!file) return c.text("Not Found", { status: 404 });
  const filename = `${new Date().getTime()}-${file.name}`;

  const cache = await caches.open(CACHE_NAME);
  const response = new Response(file);
  await cache.put(`/images/${filename}`, response);

  return new Response(
    JSON.stringify({
      success: true,
      subfolder: "",
      type: "input",
      name: filename,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    (async () => {
      const res = await app.fetch(event.request);
      if (res?.status === 404) {
        return await fetch(event.request);
      }
      return res;
    })(),
  );
});
