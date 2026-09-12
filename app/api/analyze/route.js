import { NextResponse } from "next/server";
import { analyzeTestPaper } from "@/lib/analyzer";

export const runtime = "nodejs";

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per image
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function POST(request) {
  try {
    const formData = await request.formData();

    const subject = (formData.get("subject") || "").toString().slice(0, 100);
    const studentClass = (formData.get("studentClass") || "").toString().slice(0, 50);
    const notes = (formData.get("notes") || "").toString().slice(0, 4000);

    const files = formData.getAll("images").filter((f) => f && typeof f === "object" && "arrayBuffer" in f);

    if (!notes.trim() && files.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one test paper photo or describe the test in the notes." },
        { status: 400 }
      );
    }

    if (files.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Please upload at most ${MAX_IMAGES} images.` },
        { status: 400 }
      );
    }

    const images = [];
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Each image must be under 8MB." }, { status: 400 });
      }
      const type = file.type || "image/jpeg";
      if (!ALLOWED_TYPES.has(type)) {
        return NextResponse.json(
          { error: "Only JPG, PNG, WEBP or HEIC images are supported." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      images.push({ mediaType: type, data: buffer.toString("base64") });
    }

    const result = await analyzeTestPaper({ subject, studentClass, notes, images });
    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze route error", err);
    return NextResponse.json(
      { error: "Something went wrong while analyzing the test paper. Please try again." },
      { status: 500 }
    );
  }
}
