import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(LEADS_FILE);
  } catch {
    await fs.writeFile(LEADS_FILE, "[]", "utf-8");
  }
}

export async function readLeads() {
  await ensureFile();
  const raw = await fs.readFile(LEADS_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveLead(lead) {
  // Best-effort local persistence. On read-only serverless filesystems (e.g. Vercel)
  // this write will fail — that's fine as long as LEADS_WEBHOOK_URL is configured
  // to forward leads somewhere durable (Slack, Google Sheets via Zapier/Make, email, etc).
  try {
    await ensureFile();
    const leads = await readLeads();
    leads.unshift(lead);
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist lead to local file", err);
  }

  const webhookUrl = process.env.LEADS_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      console.error("Failed to forward lead to webhook", err);
    }
  }

  return lead;
}
