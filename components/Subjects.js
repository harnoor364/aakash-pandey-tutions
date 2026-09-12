import { siteConfig } from "@/lib/siteConfig";

export default function Subjects() {
  return (
    <section id="subjects" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">What's Taught</span>
          <h2 className="section-heading">Subjects &amp; Batches</h2>
          <p className="mt-4 text-slate-600">
            Focused, exam-oriented courses for Class 11 &amp; 12 students, aligned to boards, JEE
            and NEET syllabi.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.subjects.map((s) => (
            <div key={s.name} className="card flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-xl font-bold text-slate-900">{s.name}</h3>
              <p className="mt-1 text-sm font-semibold text-brand-600">{s.classes}</p>
              <p className="mt-3 flex-1 text-sm text-slate-600">{s.description}</p>
              <a href="#contact" className="mt-5 text-sm font-semibold text-brand-600 hover:underline">
                Enquire about this batch →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
