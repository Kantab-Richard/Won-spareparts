import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fallbackLinePattern = /^(.+?)(?:\s{2,}|\s+-\s+|\s*,\s*)(\d+(?:\.\d+)?)(?:\s{2,}|\s+-\s+|\s*,\s*)(\d+(?:\.\d+)?)/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "The scan request was not valid." }, { status: 400 });
  }

  const text = String(body.text || "").trim();
  const imageDataUrl = String(body.imageDataUrl || "").trim();
  if (!text && !imageDataUrl) {
    return NextResponse.json({ ok: false, error: "Upload a supply sheet image or paste supply text first." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: true,
      fallback: true,
      transcript: text,
      items: parseSupplyText(text),
      message: "OPENAI_API_KEY is not set. Text was checked with simple parsing; image scanning needs the AI key.",
    });
  }

  try {
    const content = [
      {
        type: "input_text",
        text:
          "Extract supply or invoice stock items for an auto parts shop. Return concise JSON only. For each row, identify itemName, quantity, unitCost, totalCost, and confidence. Use empty string or 0 when missing. Do not invent values.",
      },
    ];

    if (text) {
      content.push({ type: "input_text", text: `Supplier text:\n${text}` });
    }
    if (imageDataUrl) {
      content.push({ type: "input_image", image_url: imageDataUrl, detail: "high" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "supply_scan",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                transcript: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      itemName: { type: "string" },
                      quantity: { type: "number" },
                      unitCost: { type: "number" },
                      totalCost: { type: "number" },
                      confidence: { type: "number" },
                    },
                    required: ["itemName", "quantity", "unitCost", "totalCost", "confidence"],
                  },
                },
              },
              required: ["transcript", "items"],
            },
          },
        },
      }),
      cache: "no-store",
    });

    const result = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: result.error?.message || "AI scan failed. Check OPENAI_API_KEY in Vercel." },
        { status: response.status }
      );
    }

    const outputText = result.output_text || result.output?.flatMap((item) => item.content || []).find((part) => part.text)?.text || "";
    const parsed = JSON.parse(outputText);
    return NextResponse.json({ ok: true, transcript: parsed.transcript || text, items: normalizeItems(parsed.items || []) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Unable to scan supply sheet." }, { status: 500 });
  }
}

function parseSupplyText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(fallbackLinePattern);
      if (!match) return null;
      const quantity = Number(match[2]);
      const unitCost = Number(match[3]);
      return {
        itemName: match[1].trim(),
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        confidence: 0.45,
      };
    })
    .filter(Boolean);
}

function normalizeItems(items) {
  return items
    .filter((item) => item.itemName)
    .map((item) => ({
      itemName: String(item.itemName || "").trim(),
      quantity: Number(item.quantity || 0),
      unitCost: Number(item.unitCost || 0),
      totalCost: Number(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0)),
      confidence: Number(item.confidence || 0),
    }));
}
