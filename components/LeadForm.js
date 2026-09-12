"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/siteConfig";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  studentClass: "Class 11",
  subjectInterest: "Physics",
  message: "",
  website: "", // honeypot
};

export default function LeadForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setForm(initialForm);
    } catch (err) {
      setError("Network error — please try again, or reach out on WhatsApp.");
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="bg-gradient-to-br from-brand-50 to-white py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <span className="section-eyebrow">Get Started</span>
            <h2 className="section-heading">Book a Free Demo Class</h2>
            <p className="mt-4 text-slate-600">
              Fill in your details and {siteConfig.tutorName} will personally get in touch to
              understand your learning goals and schedule a free demo class.
            </p>

            <div className="mt-8 space-y-4 text-sm">
              <a
                href={`https://wa.me/${siteConfig.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-semibold text-slate-900">Chat on WhatsApp</p>
                  <p className="text-slate-500">Fastest way to reach us</p>
                </div>
              </a>
              <a
                href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-slate-900">{siteConfig.phone}</p>
                  <p className="text-slate-500">Call for a quick chat</p>
                </div>
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="text-2xl">✉️</span>
                <div>
                  <p className="font-semibold text-slate-900">{siteConfig.email}</p>
                  <p className="text-slate-500">For detailed queries</p>
                </div>
              </a>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            {status === "success" ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <span className="text-5xl">🎉</span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Thank you!</h3>
                <p className="mt-2 text-slate-600">
                  Your request has been received. {siteConfig.tutorName} will contact you shortly
                  to schedule your free demo class.
                </p>
                <button className="btn-secondary mt-6" onClick={() => setStatus("idle")}>
                  Submit another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field, hidden from real users */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Student Name*
                    <input
                      required
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone Number*
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Class
                    <select
                      value={form.studentClass}
                      onChange={(e) => update("studentClass", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                    >
                      <option>Class 11</option>
                      <option>Class 12</option>
                      <option>Dropper / NEET-JEE</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Interested In
                    <select
                      value={form.subjectInterest}
                      onChange={(e) => update("subjectInterest", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                    >
                      <option>Physics</option>
                      <option>Chemistry</option>
                      <option>Both Physics & Chemistry</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Message (optional)
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                  />
                </label>

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <button type="submit" disabled={status === "loading"} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                  {status === "loading" ? "Submitting…" : "Request Free Demo Class"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
