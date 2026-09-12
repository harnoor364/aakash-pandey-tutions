"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/siteConfig";

const links = [
  { href: "#about", label: "About" },
  { href: "#subjects", label: "Subjects" },
  { href: "#analyzer", label: "AI Test Analyzer" },
  { href: "#testimonials", label: "Results" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm text-white">
            AP
          </span>
          <span className="text-lg">{siteConfig.tutorName}</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a href="#contact" className="hidden md:inline-flex btn-primary !px-5 !py-2.5 text-sm">
          Book Free Demo Class
        </a>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="text-xl leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-700"
              >
                {link.label}
              </a>
            ))}
            <a href="#contact" onClick={() => setOpen(false)} className="btn-primary text-sm">
              Book Free Demo Class
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
