import { siteConfig } from "@/lib/siteConfig";

export default function Footer() {
  return (
    <footer className="bg-slate-900 py-10 text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
        <p className="text-lg font-bold text-white">{siteConfig.tutorName}</p>
        <p className="text-sm">{siteConfig.tagline}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm">
          <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="hover:text-white">
            {siteConfig.phone}
          </a>
          <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
            {siteConfig.email}
          </a>
          <span>{siteConfig.location}</span>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {siteConfig.tutorName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
