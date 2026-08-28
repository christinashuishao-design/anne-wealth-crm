import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    product_name: { type: ["string", "null"] },
    supplier_name: { type: ["string", "null"] },
    material: { type: ["string", "null"] },
    capacity: { type: ["string", "null"] },
    currency: { type: "string", enum: ["CNY", "USD", "EUR", "GBP"] },
    minimum_quantity: { type: "integer", minimum: 1 },
    maximum_quantity: { type: ["integer", "null"] },
    unit_price: { type: "number", minimum: 0 },
    tax_included: { type: "string", enum: ["true", "false", "unknown"] },
    trade_term: { type: ["string", "null"] },
    valid_until: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    raw_text: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["product_name","supplier_name","material","capacity","currency","minimum_quantity","maximum_quantity","unit_price","tax_included","trade_term","valid_until","notes","raw_text","confidence"],
};

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录 CRM" }, { status: 401 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "云端尚未配置 OPENAI_API_KEY，暂时不能识别截图" }, { status: 503 });
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !image.size) return NextResponse.json({ error: "请选择截图" }, { status: 400 });
  if (!image.type.startsWith("image/") || image.size > 10 * 1024 * 1024) return NextResponse.json({ error: "仅支持 10MB 以内的图片" }, { status: 400 });
  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      input: [{ role: "user", content: [
        { type: "input_text", text: "识别这张供应商报价或产品截图。只提取图片中明确可见的信息，不推测；价格必须对应数量阶梯。若截图有多个价格，只返回最清晰的第一条价格阶梯，并在 notes 中列出其余阶梯。日期输出 YYYY-MM-DD，无法确定填 null。" },
        { type: "input_image", image_url: `data:${image.type};base64,${base64}`, detail: "high" },
      ] }],
      text: { format: { type: "json_schema", name: "recognized_product_price", strict: true, schema } },
    }),
  });
  const json = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
  if (!response.ok) return NextResponse.json({ error: json.error?.message || "截图识别失败" }, { status: 502 });
  const outputText = json.output_text || json.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let imagePath: string | null = null;
  if (serviceKey && supabaseUrl) {
    const ext = image.type.includes("png") ? "png" : image.type.includes("webp") ? "webp" : "jpg";
    imagePath = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/pricing-screenshots/${imagePath}`, { method: "POST", headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": image.type, "x-upsert": "false" }, body: Buffer.from(base64, "base64") });
    if (!upload.ok) imagePath = null;
  }
  try { return NextResponse.json({ data: { ...JSON.parse(outputText || "{}"), source_image_path: imagePath } }); }
  catch { return NextResponse.json({ error: "识别结果格式异常，请重试" }, { status: 502 }); }
}
