import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fallbackLinePattern = /^(.+?)(?:\s{2,}|\s+-\s+|\s*,\s*)(\d+(?:\.\d+)?)(?:\s{2,}|\s+-\s+|\s*,\s*)(\d+(?:\.\d+)?)/;
const defaultProviderOrder = ["openai", "gemini", "openrouter", "deepseek"];

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

  const providers = getProviderChain({ hasImage: Boolean(imageDataUrl), hasText: Boolean(text) });
  const attempts = [];

  for (const provider of providers) {
    try {
      const parsed = await scanWithProvider(provider, { text, imageDataUrl });
      return NextResponse.json({
        ok: true,
        provider: provider.label,
        transcript: parsed.transcript || text,
        items: normalizeItems(parsed.items || []),
        message: `${provider.label} scanned the supply sheet successfully.`,
      });
    } catch (error) {
      attempts.push(`${provider.label}: ${cleanError(error.message)}`);
    }
  }

  const fallbackItems = parseSupplyText(text);
  if (fallbackItems.length) {
    return NextResponse.json({
      ok: true,
      fallback: true,
      provider: "Simple text parser",
      transcript: text,
      items: fallbackItems,
      message: `AI providers were not available, so simple text parsing was used. Attempts: ${attempts.join(" | ")}`,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        attempts.length > 0
          ? `AI scan failed on all configured providers. ${attempts.join(" | ")}`
          : "No AI provider key is configured. Add at least one AI key in Vercel, or paste supply text in rows like: Brake Pad, 12, 35.",
    },
    { status: 502 }
  );
}

async function scanWithProvider(provider, payload) {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify(buildChatBody(provider, payload)),
    cache: "no-store",
  });

  const resultText = await response.text();
  const result = safeJson(resultText);

  if (!response.ok) {
    throw new Error(result?.error?.message || result?.message || `HTTP ${response.status}`);
  }

  const outputText =
    result?.choices?.[0]?.message?.content ||
    result?.output_text ||
    result?.output?.flatMap((item) => item.content || []).find((part) => part.text)?.text ||
    "";

  const parsed = parseAiJson(outputText);
  if (!Array.isArray(parsed.items)) {
    throw new Error("AI did not return item rows.");
  }
  return parsed;
}

function buildChatBody(provider, { text, imageDataUrl }) {
  const userContent = [
    {
      type: "text",
      text:
        "Extract supply or invoice stock items for an auto parts shop. Return JSON only with this shape: {\"transcript\":\"...\",\"items\":[{\"itemName\":\"...\",\"categoryName\":\"...\",\"quantity\":1,\"unitCost\":1,\"totalCost\":1,\"confidence\":0.9}]}. Identify itemName, categoryName if visible or obvious, quantity, unitCost, totalCost, and confidence. Use empty string or 0 when missing. Do not invent values.",
    },
  ];

  if (text) {
    userContent.push({ type: "text", text: `Supplier text:\n${text}` });
  }
  if (imageDataUrl && provider.supportsImages) {
    userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  const body = {
    model: provider.model,
    messages: [
      { role: "system", content: "You extract supplier invoice rows and return valid JSON only." },
      { role: "user", content: userContent },
    ],
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  };

  if (provider.models?.length) {
    body.models = provider.models;
  }

  return body;
}

function getProviderChain({ hasImage, hasText }) {
  const configs = {
    openai: {
      label: "OpenAI",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      url: "https://api.openai.com/v1/chat/completions",
      supportsImages: true,
    },
    gemini: {
      label: "Gemini",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      supportsImages: true,
    },
    openrouter: {
      label: "OpenRouter",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
      models: envList("OPENROUTER_FALLBACK_MODELS"),
      url: "https://openrouter.ai/api/v1/chat/completions",
      supportsImages: true,
      extraHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://won-spareparts.vercel.app",
        "X-OpenRouter-Title": "WONSPAREPARTS",
      },
    },
    deepseek: {
      label: "DeepSeek",
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      url: "https://api.deepseek.com/chat/completions",
      supportsImages: false,
    },
  };

  return envList("AI_PROVIDER_ORDER", defaultProviderOrder)
    .map((id) => configs[id.toLowerCase()])
    .filter(Boolean)
    .filter((provider) => provider.key)
    .filter((provider) => !hasImage || hasText || provider.supportsImages)
    .map((provider) => ({
      ...provider,
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
        ...(provider.extraHeaders || {}),
      },
    }));
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
        categoryName: "",
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
      categoryName: String(item.categoryName || item.suggestedCategory || "").trim(),
      quantity: Number(item.quantity || 0),
      unitCost: Number(item.unitCost || 0),
      totalCost: Number(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0)),
      confidence: Number(item.confidence || 0),
    }));
}

function parseAiJson(outputText) {
  const cleaned = String(outputText || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned unreadable text.");
    return JSON.parse(match[0]);
  }
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function envList(name, fallback = []) {
  const value = process.env[name];
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanError(message) {
  return String(message || "failed").replace(/\s+/g, " ").slice(0, 180);
}
