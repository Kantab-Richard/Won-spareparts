import { NextResponse } from "next/server";
import { sampleData } from "../../../lib/sampleData";

export const dynamic = "force-dynamic";

const demoDefaultSettings = {
  manager_name: "Manager",
  manager_username: "manager",
  manager_password: "manager123",
};

function sanitizeDemoData(data) {
  const { manager_password, ...safeSettings } = { ...demoDefaultSettings, ...(data.settings || {}) };
  return { ...data, settings: { ...safeSettings, manager_password: "" } };
}

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
    if (body.action === "login") {
      const username = String(body.payload?.username || "").trim().toLowerCase();
      const password = String(body.payload?.password || "");
      const settings = { ...demoDefaultSettings, ...(sampleData.settings || {}) };
      if (username === String(settings.manager_username).toLowerCase() && password === settings.manager_password) {
        return NextResponse.json({ ok: true, demo: true, session: { role: "manager", name: settings.manager_name, username }, data: sanitizeDemoData(sampleData) });
      }
      const rep = (sampleData.salesReps || []).find(
        (item) => String(item.Username || "").trim().toLowerCase() === username && String(item.Password || "") === password && (item.Status || "Active") === "Active"
      );
      if (rep) {
        return NextResponse.json({ ok: true, demo: true, session: { role: "sales", repId: rep.Rep_ID, name: rep.Rep_Name, username: rep.Username }, data: sanitizeDemoData(sampleData) });
      }
      return NextResponse.json({ ok: false, error: "Login failed. Check the username and password." }, { status: 400 });
    }
    if (body.action === "updateSettings") {
      return NextResponse.json({ ok: true, demo: true, data: sanitizeDemoData({ ...sampleData, settings: { ...sampleData.settings, ...(body.payload || {}) } }) });
    }
    return NextResponse.json({ ok: true, demo: true, data: sanitizeDemoData(sampleData) });
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
