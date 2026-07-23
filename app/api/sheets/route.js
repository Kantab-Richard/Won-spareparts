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
    if (body.action === "healthCheck") {
      return NextResponse.json({
        ok: true,
        demo: true,
        message: "The app is in demo mode. Add APPS_SCRIPT_URL and APPS_SCRIPT_TOKEN in Vercel to save real records.",
      });
    }
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

    if (!result.ok && result.error === "Unknown action") {
      return NextResponse.json(
        {
          ok: false,
          error: "Google Apps Script does not have this latest action yet. Paste the latest Code.gs, deploy a new Apps Script version, then redeploy Vercel.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Unable to reach Google Apps Script." }, { status: 500 });
  }
}
