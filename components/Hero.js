import { siteConfig } from "@/lib/siteConfig";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            Class 11 &amp; 12 · Boards · JEE · NEET
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
            {siteConfig.tutorName}
          </h1>
          <p className="mt-3 text-xl font-semibold text-brand-100">{siteConfig.tagline}</p>
          <p className="mt-5 max-w-lg text-brand-100/90">{siteConfig.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#contact" className="btn-primary bg-accent-500 shadow-accent-500/30 hover:bg-accent-600">
              Book a Free Demo Class
            </a>
            <a href="#analyzer" className="btn-secondary border-white/70 text-white hover:bg-white/10">
              Try the AI Test Analyzer
            </a>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-extrabold">{siteConfig.experienceYears}+</p>
              <p className="text-xs text-brand-100/80">Years Experience</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{siteConfig.studentsTaught}+</p>
              <p className="text-xs text-brand-100/80">Students Taught</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{siteConfig.avgImprovement}</p>
              <p className="text-xs text-brand-100/80">Avg. Score Jump</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="card rotate-2 bg-white p-6 text-slate-800 shadow-2xl">
            <p className="section-eyebrow">Latest Test Analysis</p>
            <p className="mb-1 font-bold text-slate-900">Physics · Rotational Motion</p>
            <div className="mb-4 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 w-3/4 rounded-full bg-brand-500" />
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>✅ Strong: Kinematics, Laws of Motion</li>
              <li>⚠️ Weak: Torque &amp; Angular Momentum</li>
              <li>📈 Suggested: 3 practice sets this week</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
