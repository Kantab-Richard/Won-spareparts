import { NextResponse } from "next/server";
import { sampleData } from "../../../lib/sampleData";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "The app sent an invalid request." }, { status: 400 });
  }

  const appScriptUrl = process.env.APPS_SCRIPT_URL || "";

  if (!appScriptUrl || appScriptUrl.includes("YOUR_DEPLOYMENT_ID")) {
    return NextResponse.json({ ok: true, demo: true, data: sampleData });
  }

  try {
    const response = await fetch(appScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        ...body,
        token: process.env.APPS_SCRIPT_TOKEN || "",
      }),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Google Apps Script returned a web page instead of data. Check that APPS_SCRIPT_URL is the deployed Web App /exec URL and that access is set to anyone with the link.",
        },
        { status: 502 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Google Apps Script returned invalid JSON. Check the Apps Script deployment logs." },
        { status: 502 }
      );
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Unable to reach Google Apps Script." }, { status: 500 });
  }
}
