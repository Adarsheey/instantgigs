import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent startup crashes if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Full-stack API Route for AI Cover Letter & Pitch Generator
app.post("/api/ai/pitch", async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobTitle, jobCompany, jobDescription, userProfile } = req.body;

    if (!jobTitle || !jobCompany) {
       res.status(400).json({ error: "Missing required job information (jobTitle, jobCompany)" });
       return;
    }

    const client = getGeminiClient();

    const prompt = `
      You are an expert career counselor helping college students craft high-converting, friendly, and professional application pitches and quick cover letters for local part-time gigs and casual jobs.

      Job details:
      - Title: ${jobTitle}
      - Employer/Company: ${jobCompany}
      - Description: ${jobDescription || "N/A"}

      Applicant Profile:
      - Name: ${userProfile?.name || "A Student"}
      - Major: ${userProfile?.major || "Undecided"}
      - College Year: ${userProfile?.year || "Junior"}
      - Key Skills: ${(userProfile?.skills || []).join(", ") || "quick learner, positive attitude"}
      - Student Bio: ${userProfile?.bio || "N/A"}

      Task:
      Generate a highly compelling, short, and polite application pitch or short cover letter (around 120-180 words) that the student can send directly to the employer.
      Make sure to:
      1. Reference why the student is excited about this specific role (${jobTitle} at ${jobCompany}).
      2. Link 1 or 2 of their relevant skills/interests to the job requirements.
      3. Focus on student strengths: reliability, high energy, willingness to work hard, and adaptability.
      4. Keep the tone friendly, polite, enthusiastic, and humble. Do not sound overly corporate; write it like a genuine, eager college student.
      5. Include contact place-holders at the end using the applicant's name, email, and phone.
      6. Use clean markdown formatting.
    `;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ pitch: response.text });
  } catch (error: any) {
    console.error("Gemini API Error in /api/ai/pitch:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred while generating the pitch with Gemini AI."
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Vite middleware integration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start Vite dev server middleware:", err);
  process.exit(1);
});
