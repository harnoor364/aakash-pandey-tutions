"use client";

import { useRef, useState } from "react";

const MAX_IMAGES = 3;

export default function TestAnalyzer() {
  const [subject, setSubject] = useState("Physics");
  const [studentClass, setStudentClass] = useState("Class 12");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []).slice(0, MAX_IMAGES);
    setFiles(selected);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!notes.trim() && files.length === 0) {
      setError("Please upload a photo of the test paper or describe it in the notes box.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("studentClass", studentClass);
      formData.append("notes", notes);
      files.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
    setNotes("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section id="analyzer" className="bg-slate-900 py-20 text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow !text-accent-400">AI-Powered</span>
          <h2 className="text-3xl font-bold sm:text-4xl">Test Paper Analyzer</h2>
          <p className="mt-4 text-slate-300">
            Upload a photo of a graded Physics or Chemistry test paper (or just describe it), and
            get an instant AI breakdown of strengths, weak topics, silly mistakes and a 7-day
            fix-it study plan.
          </p>
        </div>

        {!result && (
          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white p-6 text-slate-800 shadow-xl sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Subject
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Physics & Chemistry</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Class
                <select
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                >
                  <option>Class 11</option>
                  <option>Class 12</option>
                  <option>Dropper / NEET-JEE</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Upload photo(s) of the test paper (up to {MAX_IMAGES})
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              {files.length > 0 && (
                <span className="mt-1 block text-xs text-slate-500">{files.length} file(s) selected</span>
              )}
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Or describe the test (topics covered, marks obtained, mistakes made)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="e.g. Physics unit test on Rotational Motion, scored 24/40. Lost marks in torque numericals and one theory question on angular momentum conservation."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
              />
            </label>

            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Analyzing test paper…" : "Analyze My Test Paper"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Your test paper is analyzed securely and is not shared publicly.
            </p>
          </form>
        )}

        {result && <AnalysisResult data={result} onReset={reset} />}
      </div>
    </section>
  );
}

function AnalysisResult({ data, onReset }) {
  const { analysis, demo } = data;

  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-6 text-slate-800 shadow-xl sm:p-8">
      {demo && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Showing a <strong>sample</strong> analysis — the AI analyzer isn&apos;t connected to a
          live API key yet. Set <code>ANTHROPIC_API_KEY</code> on the server to enable real analysis.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-2xl font-bold text-slate-900">{analysis.subject} — Analysis</h3>
        <span className="rounded-full bg-brand-50 px-4 py-1 text-sm font-bold text-brand-700">
          {analysis.overallScore}
        </span>
      </div>

      <p className="mt-4 text-slate-600">{analysis.summary}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h4 className="font-semibold text-emerald-700">✅ Strengths</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
            {(analysis.strengths || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-red-700">⚠️ Silly Mistakes</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
            {(analysis.silly_mistakes || []).length > 0 ? (
              analysis.silly_mistakes.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li>None flagged — good attention to detail!</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold text-slate-900">🎯 Weak Topics &amp; How to Fix Them</h4>
        <div className="mt-3 space-y-3">
          {(analysis.weakTopics || []).map((w, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{w.topic}</p>
              <p className="mt-1 text-sm text-slate-500">{w.issue}</p>
              <p className="mt-2 text-sm font-medium text-brand-700">💡 {w.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold text-slate-900">📅 7-Day Fix-It Plan</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(analysis.studyPlan || []).map((d, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-4 py-2 text-sm">
              <span className="font-semibold text-slate-800">{d.day}: </span>
              <span className="text-slate-600">{d.focus}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
        {analysis.motivationalNote}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onReset} className="btn-secondary">
          Analyze Another Paper
        </button>
        <a href="#contact" className="btn-primary">
          Book a Session to Fix These Gaps
        </a>
      </div>
    </div>
  );
}
