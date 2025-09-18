import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { db, isAdminReady } from "@/firebase/admin";
import nodemailer from "nodemailer";
import { z } from "zod";

// Schema for Gemini analysis
const candidateInfoSchema = z.object({
  candidateName: z.string(),
  email: z.string().nullable(),
  topSkills: z.array(z.string()),
  summary: z.string(),
  matchScore: z.number().min(0).max(100),
  recommended: z.enum(["yes", "no"]),
});

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Extract text from different file types
async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  try {
    if (file.type === "application/pdf") {
      // For now, return a placeholder text since PDF parsing is complex
      // In a real implementation, you'd use a proper PDF library
      console.log("PDF file detected - returning placeholder text");
      return `PDF Document: ${file.name}\n\nThis is a placeholder for PDF content extraction. In a production environment, you would use a proper PDF parsing library to extract the actual text content from the PDF file.`;
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    ) {
      // Dynamic import for Word documents (.docx and .doc)
      try {
        const mammoth = (await import("mammoth")).default;
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (wordError) {
        console.error("Word parsing failed:", wordError);
        // Fallback: try to extract text as plain text
        return buffer.toString("utf-8");
      }
    } else if (file.type === "text/plain") {
      return buffer.toString("utf-8");
    } else {
      // For other file types, try to extract as text
      return buffer.toString("utf-8");
    }
  } catch (error) {
    console.error(`Error extracting text from ${file.name} (${file.type}):`, error);
    return "";
  }
}

// Analyze resume with Gemini
async function analyzeResume(resumeText: string, jobDescription: string): Promise<{
  candidateName: string;
  email: string | null;
  topSkills: string[];
  summary: string;
  matchScore: number;
  recommended: "yes" | "no";
}> {
  // Limit text length to avoid token limits
  const limitedText = resumeText.substring(0, 20000);
  
  const { object } = await generateObject({
    model: google("gemini-2.0-flash-001"),
    schema: candidateInfoSchema,
    prompt: `You are an ATS analyzer. Given the Job Description and the Resume, output JSON ONLY with keys:
     candidateName (string), email (string|null), topSkills (array of strings), summary (string <= 200 chars), matchScore (number 0-100), recommended ('yes'|'no').

Job Description:
${jobDescription}

Resume Text:
${limitedText}`,
  });

  return object;
}

// Send email to shortlisted candidates
async function sendShortlistEmail(candidateEmail: string, candidateName: string, calendlyLink: string) {
  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: candidateEmail,
    subject: "Congratulations! You've been shortlisted for an interview",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Congratulations ${candidateName}!</h2>
        <p>Great news! Your application has been reviewed and you've been shortlisted for the next round of interviews.</p>
        <p>We were impressed by your qualifications and would like to schedule an interview with you.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${calendlyLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Schedule Your Interview
          </a>
        </div>
        <p>Please use the link above to select a convenient time for your interview. If you have any questions, feel free to reach out to us.</p>
        <p>Best regards,<br>The Hiring Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${candidateEmail}`);
  } catch (error) {
    console.error(`Failed to send email to ${candidateEmail}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("API called - starting resume processing");
    
    // Check if Firebase admin is ready, but don't fail completely
    if (!isAdminReady()) {
      console.warn("Firebase admin not configured - running in demo mode");
      // For now, let's continue without Firebase to test the file processing
    }

    const formData = await request.formData();
    const jobDescription = formData.get("jobDescription") as string;
    
    if (!jobDescription) {
      return NextResponse.json(
        { success: false, error: "Job description is required" },
        { status: 400 }
      );
    }

    // Extract files from form data
    const files: File[] = [];
    let fileIndex = 0;
    while (formData.has(`file_${fileIndex}`)) {
      const file = formData.get(`file_${fileIndex}`) as File;
      if (file) {
        files.push(file);
      }
      fileIndex++;
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: "Maximum 10 files allowed" },
        { status: 400 }
      );
    }

    // Validate file types - only allow PDF and Word documents
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword" // .doc
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid file type: ${file.name}. Only PDF and Word documents are allowed.` 
          },
          { status: 400 }
        );
      }
    }

    // Create recruit run document (only if Firebase is ready)
    let runId = "demo-run-" + Date.now();
    const runData: RecruitRun = {
      jobDescription,
      createdAt: new Date().toISOString(),
      total: files.length,
      shortlisted: [],
      runStatus: "processing",
    };

    if (isAdminReady()) {
      const runRef = db.collection("recruit_runs").doc();
      runId = runRef.id;
      await runRef.set(runData);
    }

    const candidates: RecruitCandidate[] = [];
    const shortlistedCandidates: Array<{
      id: string;
      candidateName: string;
      email: string;
      matchScore: number;
    }> = [];

    // Process each file
    console.log(`Processing ${files.length} files`);
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.type})`);
        // Extract text from file
        const resumeText = await extractTextFromFile(file);
        console.log(`Extracted text length: ${resumeText.length}`);
        
        if (!resumeText.trim()) {
          console.warn(`No text extracted from ${file.name}`);
          continue;
        }

        // Analyze with Gemini
        console.log(`Analyzing resume with Gemini. Text length: ${resumeText.length}`);
        const analysis = await analyzeResume(resumeText, jobDescription);
        console.log(`Analysis result:`, analysis);
        
        // Create candidate document (only if Firebase is ready)
        const candidateId = "demo-candidate-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        
        const candidateData: RecruitCandidate = {
          runId,
          fileName: file.name,
          textSnippet: resumeText.substring(0, 1000), // Store first 1000 chars
          ai: analysis,
          email: analysis.email,
          createdAt: new Date().toISOString(),
        };

        if (isAdminReady()) {
          const candidateRef = db.collection("recruit_candidates").doc();
          candidateData.id = candidateRef.id;
          await candidateRef.set(candidateData);
        } else {
          candidateData.id = candidateId;
        }
        
        candidates.push({ ...candidateData, id: candidateId });

        // Add to shortlisted if recommended
        if (analysis.recommended === "yes") {
          shortlistedCandidates.push({
            id: candidateId,
            candidateName: analysis.candidateName,
            email: analysis.email || "no-email@example.com", // Use placeholder if no email
            matchScore: analysis.matchScore,
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    // Update run with shortlisted candidates (only if Firebase is ready)
    const updatedRunData: RecruitRun = {
      ...runData,
      shortlisted: shortlistedCandidates,
      runStatus: "completed",
    };

    if (isAdminReady()) {
      const runRef = db.collection("recruit_runs").doc(runId);
      await runRef.update(updatedRunData as unknown as Record<string, unknown>);
    }

    // Send emails to shortlisted candidates (only if SMTP is configured)
    const calendlyLink = process.env.NEXT_PUBLIC_CALENDLY_LINK || "https://calendly.com/your-company/interview";
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      for (const candidate of shortlistedCandidates) {
        await sendShortlistEmail(candidate.email, candidate.candidateName, calendlyLink);
      }
    } else {
      console.log("SMTP not configured - skipping email sending");
    }

    console.log(`Final results - Total candidates: ${candidates.length}, Shortlisted: ${shortlistedCandidates.length}`);
    console.log('Candidates:', candidates);
    console.log('Shortlisted candidates:', shortlistedCandidates);
    console.log('Run data:', updatedRunData);

    return NextResponse.json({
      success: true,
      runId,
      totalProcessed: candidates.length,
      shortlisted: shortlistedCandidates.length,
      runData: updatedRunData, // Include the run data for frontend storage
      candidates: candidates, // Include candidates data for frontend storage
    });

  } catch (error) {
    console.error("Resume processing error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
