import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(
  _request: Request,
  context: RouteContext<"/api/product-images/[name]">,
) {
  const { name } = await context.params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(name))
    return new Response("Not found", { status: 404 });
  try {
    const file = await readFile(
        path.join(process.cwd(), "data", "uploads", "products", name),
      ),
      type = name.endsWith(".png")
        ? "image/png"
        : name.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
    return new Response(file, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
