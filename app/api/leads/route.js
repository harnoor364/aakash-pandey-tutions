import { NextResponse } from "next/server";
import { readLeads, saveLead } from "@/lib/leads";

export const runtime = "nodejs";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = (body.name || "").toString().trim().slice(0, 100);
    const phone = (body.phone || "").toString().trim().slice(0, 20);
    const email = (body.email || "").toString().trim().slice(0, 150);
    const studentClass = (body.studentClass || "").toString().trim().slice(0, 50);
    const subjectInterest = (body.subjectInterest || "").toString().trim().slice(0, 100);
    const message = (body.message || "").toString().trim().slice(0, 1000);
    // honeypot field — real users never fill this in
    const website = (body.website || "").toString();

    if (website) {
      return NextResponse.json({ ok: true });
    }

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone number are required." }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const lead = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      phone,
      email,
      studentClass,
      subjectInterest,
      message,
      source: "website",
      createdAt: new Date().toISOString(),
    };

    await saveLead(lead);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("leads POST error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET(request) {
  const password = request.headers.get("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await readLeads();
  return NextResponse.json({ leads });
}
