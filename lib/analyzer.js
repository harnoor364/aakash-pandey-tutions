import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are an expert Physics & Chemistry exam analyst helping a tutor named Akash Pandey
diagnose Class 11 & 12 students' test papers (board exams, JEE, and NEET style).

You will be given either:
- one or more photos of a graded/attempted test paper, and/or
- text describing the test (subject, topics, marks obtained per question/topic, mistakes made).

Carefully read the questions, the student's answers/working, marks awarded, and any teacher remarks visible.
Then produce a strict JSON object (no markdown, no commentary outside the JSON) with this exact shape:

{
  "subject": string,               // "Physics", "Chemistry", or "Physics & Chemistry"
  "overallScore": string,          // e.g. "58/100" or "Not clearly stated" if unknown
  "summary": string,               // 2-3 sentence plain-language summary of performance
  "strengths": [string],           // topics/skills the student did well in (2-5 items)
  "weakTopics": [
    {
      "topic": string,
      "issue": string,             // what specifically went wrong (concept gap, silly mistake, time pressure, etc.)
      "recommendation": string     // concrete, actionable fix
    }
  ],
  "silly_mistakes": [string],      // calculation/sign/unit errors etc, if any, else []
  "studyPlan": [
    { "day": string, "focus": string }  // a focused 7-day plan, "day" like "Day 1"
  ],
  "motivationalNote": string       // short, encouraging note addressed to the student
}

Be specific and reference actual topics/question numbers where possible instead of generic advice.
If the input is too vague or unreadable to analyze meaningfully, still return valid JSON in the same
shape, explaining the limitation inside "summary" and leaving other arrays reasonably populated with
best-effort general guidance for that subject at Class 11/12 level.`;

export function isAnalyzerConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildDemoAnalysis({ subject, notes }) {
  return {
    subject: subject || "Physics & Chemistry",
    overallScore: "Demo mode",
    summary:
      "This is a sample analysis shown because the AI analyzer is not yet configured with an API key. Once ANTHROPIC_API_KEY is set on the server, this panel will show a real, detailed analysis of the uploaded test paper.",
    strengths: ["Conceptual questions", "Diagram-based questions"],
    weakTopics: [
      {
        topic: "Numerical problem-solving",
        issue: "Marks lost due to calculation errors under time pressure (sample data).",
        recommendation: "Practice 10 timed numericals daily focusing on unit consistency.",
      },
      {
        topic: notes ? "Topic mentioned in your notes" : "Organic reaction mechanisms",
        issue: "Sample issue — connect a real API key to get an issue specific to the uploaded paper.",
        recommendation: "Revise the mechanism with arrow-pushing diagrams and redo 5 past-year questions.",
      },
    ],
    silly_mistakes: ["Sign errors in vector questions (sample)"] ,
    studyPlan: [
      { day: "Day 1", focus: "Revise weak topic concepts from NCERT" },
      { day: "Day 2", focus: "Solve 15 MCQs on the weak topic" },
      { day: "Day 3", focus: "Attempt a timed mixed test" },
      { day: "Day 4", focus: "Review mistakes with Akash sir" },
      { day: "Day 5", focus: "Practice numericals" },
      { day: "Day 6", focus: "Revise strengths to stay sharp" },
      { day: "Day 7", focus: "Full-length mock test" },
    ],
    motivationalNote:
      "Every mistake in a test is a roadmap to your next 10 marks — keep going!",
  };
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in AI response");
  return JSON.parse(text.slice(start, end + 1));
}

export async function analyzeTestPaper({ subject, studentClass, notes, images }) {
  if (!isAnalyzerConfigured()) {
    return { demo: true, analysis: buildDemoAnalysis({ subject, notes }) };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const contextLines = [
      subject ? `Subject: ${subject}` : null,
      studentClass ? `Student class: ${studentClass}` : null,
      notes ? `Additional notes from student/parent: ${notes}` : null,
    ].filter(Boolean);

    const content = [];

    if (images && images.length) {
      for (const img of images) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        });
      }
    }

    content.push({
      type: "text",
      text: `${contextLines.join("\n")}\n\nAnalyze this test paper and respond with the JSON object described in your instructions.`,
    });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock) throw new Error("AI response contained no text");

    const analysis = extractJson(textBlock.text);
    return { demo: false, analysis };
  } catch (err) {
    // A misconfigured/invalid key or a transient API error should never break the page for a
    // visitor — fall back to a clearly-labeled demo analysis instead of a hard error.
    console.error("Anthropic analysis failed, falling back to demo mode:", err);
    return { demo: true, demoReason: "api_error", analysis: buildDemoAnalysis({ subject, notes }) };
  }
}
