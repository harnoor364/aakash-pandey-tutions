import { siteConfig } from "@/lib/siteConfig";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div className="order-2 md:order-1">
          <span className="section-eyebrow">About the Mentor</span>
          <h2 className="section-heading">
            Making Physics &amp; Chemistry click for Class 11 &amp; 12 students
          </h2>
          <p className="mt-5 text-slate-600">
            {siteConfig.tutorName} has spent over {siteConfig.experienceYears} years helping
            students move from confusion to clarity in Physics and Chemistry. His teaching blends
            strong NCERT fundamentals with the problem-solving edge required for JEE and NEET —
            so students are equally prepared for board exams and competitive tests.
          </p>
          <p className="mt-4 text-slate-600">
            Every batch is kept small so each student gets individual attention, regular doubt
            sessions, and a test-driven approach — because marks are won and lost in the details.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {siteConfig.highlights.map((h) => (
              <div key={h.title} className="card p-4">
                <p className="font-semibold text-slate-900">{h.title}</p>
                <p className="mt-1 text-sm text-slate-500">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="order-1 flex justify-center md:order-2">
          <div className="flex h-72 w-72 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-brand-200 text-7xl font-extrabold text-brand-600 shadow-inner sm:h-80 sm:w-80">
            AP
          </div>
        </div>
      </div>
    </section>
  );
}
