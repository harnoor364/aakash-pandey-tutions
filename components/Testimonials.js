import { siteConfig } from "@/lib/siteConfig";

export default function Testimonials() {
  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="section-eyebrow">Results That Speak</span>
        <h2 className="section-heading">What students &amp; parents say</h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {siteConfig.testimonials.map((t) => (
          <div key={t.name} className="card p-6">
            <p className="text-amber-500">★★★★★</p>
            <p className="mt-3 text-sm italic text-slate-600">&ldquo;{t.quote}&rdquo;</p>
            <p className="mt-4 font-semibold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-500">{t.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
