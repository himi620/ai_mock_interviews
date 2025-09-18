import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { db, isAdminReady } from "@/firebase/admin";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";
import nodemailer from "nodemailer";
import { z } from "zod";

// Schema for interview report
const interviewReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendedNextStep: z.enum(["onsite", "hr", "reject"]),
  detailedNotes: z.string(),
});

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Generate interview report using Gemini
async function generateInterviewReport(
  transcript: Array<{ role: string; content: string }>,
  resumeText: string,
  jobDescription: string
): Promise<any> {
  const formattedTranscript = transcript
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const { object } = await generateObject({
    model: google("gemini-2.0-flash-001"),
    schema: interviewReportSchema,
    prompt: `You are an interview evaluator. Given resume, job description and full transcript (Q/A format), produce JSON with: overallScore (0-100), strengths[], weaknesses[], recommendedNextStep('onsite'|'hr'|'reject'), detailedNotes: string.

Job Description:
${jobDescription}

Resume Text:
${resumeText.substring(0, 5000)}

Interview Transcript:
${formattedTranscript}`,
  });

  return object;
}

// Send admin notification email
async function sendAdminNotification(
  candidateName: string,
  candidateEmail: string,
  report: any,
  interviewId: string
) {
  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `Interview Completed: ${candidateName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Interview Completed</h2>
        <p><strong>Candidate:</strong> ${candidateName} (${candidateEmail})</p>
        <p><strong>Overall Score:</strong> ${report.overallScore}/100</p>
        <p><strong>Recommendation:</strong> ${report.recommendedNextStep}</p>
        
        <h3>Strengths:</h3>
        <ul>
          ${report.strengths.map((strength: string) => `<li>${strength}</li>`).join("")}
        </ul>
        
        <h3>Areas for Improvement:</h3>
        <ul>
          ${report.weaknesses.map((weakness: string) => `<li>${weakness}</li>`).join("")}
        </ul>
        
        <h3>Detailed Notes:</h3>
        <p>${report.detailedNotes}</p>
        
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recruit/dashboard">View Dashboard</a></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin notification sent for interview ${interviewId}`);
  } catch (error) {
    console.error(`Failed to send admin notification:`, error);
  }
}

// Send candidate follow-up email
async function sendCandidateFollowUp(
  candidateEmail: string,
  candidateName: string,
  report: any
) {
  const transporter = createEmailTransporter();
  
  let nextSteps = "";
  if (report.recommendedNextStep === "onsite") {
    nextSteps = "We'd like to invite you for an onsite interview. Our team will contact you soon to schedule this.";
  } else if (report.recommendedNextStep === "hr") {
    nextSteps = "We'd like to move forward with HR discussions. Our HR team will reach out to you shortly.";
  } else {
    nextSteps = "Thank you for your time. We'll keep your information on file for future opportunities.";
  }
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: candidateEmail,
    subject: "Interview Follow-up",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Thank you, ${candidateName}!</h2>
        <p>Thank you for completing the interview. We appreciate the time you took to speak with us.</p>
        <p><strong>Next Steps:</strong> ${nextSteps}</p>
        <p>If you have any questions, please don't hesitate to reach out to us.</p>
        <p>Best regards,<br>The Hiring Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Follow-up email sent to ${candidateEmail}`);
  } catch (error) {
    console.error(`Failed to send follow-up email:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminReady()) {
      return NextResponse.json(
        { success: false, error: "Firebase admin not configured" },
        { status: 500 }
      );
    }

    // Verify internal API key
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.INTERNAL_API_KEY || "internal-key";
    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // Get interview document
    const interviewDoc = await db.collection("recruit_interviews").doc(interviewId).get();
    if (!interviewDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Interview not found" },
        { status: 404 }
      );
    }

    const interviewData = interviewDoc.data() as RecruitInterview;
    
    // Get candidate data
    const candidateDoc = await db.collection("recruit_candidates").doc(interviewData.candidateId).get();
    if (!candidateDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const candidateData = candidateDoc.data() as RecruitCandidate;

    // Update interview status
    await db.collection("recruit_interviews").doc(interviewId).update({
      status: "in_progress",
    });

    // Start VAPI interview
    const transcript: Array<{ role: string; content: string }> = [];
    let recordingUrl: string | undefined;

    return new Promise((resolve) => {
      const onMessage = (message: any) => {
        if (message.type === "transcript" && message.transcriptType === "final") {
          transcript.push({
            role: message.role,
            content: message.transcript,
          });
        }
      };

      const onCallEnd = async () => {
        try {
          // Clean up event listeners
          vapi.off("message", onMessage);
          vapi.off("call-end", onCallEnd);
          vapi.off("error", onError);

          // Get job description from run data
          const runDoc = await db.collection("recruit_runs").doc(interviewData.runId).get();
          const runData = runDoc.data() as RecruitRun;
          const jobDescription = runData?.jobDescription || "";

          // Generate interview report
          const report = await generateInterviewReport(
            transcript,
            candidateData.textSnippet,
            jobDescription
          );

          // Create feedback
          const { success, feedbackId } = await createFeedback({
            interviewId,
            userId: interviewData.candidateId,
            transcript,
            feedbackId: undefined,
          });

          // Update interview document
          await db.collection("recruit_interviews").doc(interviewId).update({
            status: "completed",
            transcript,
            recordingUrl,
            report,
            vapiSessionId: "vapi-session-id", // This would be set by VAPI
          });

          // Send emails
          await sendAdminNotification(
            candidateData.ai.candidateName,
            interviewData.candidateEmail,
            report,
            interviewId
          );

          await sendCandidateFollowUp(
            interviewData.candidateEmail,
            candidateData.ai.candidateName,
            report
          );

          resolve(NextResponse.json({
            success: true,
            interviewId,
            feedbackId,
            message: "Interview completed successfully",
          }));
        } catch (error) {
          console.error("Error processing interview completion:", error);
          resolve(NextResponse.json(
            { success: false, error: "Failed to process interview completion" },
            { status: 500 }
          ));
        }
      };

      const onError = (error: Error) => {
        console.error("VAPI error:", error);
        // Clean up event listeners
        vapi.off("message", onMessage);
        vapi.off("call-end", onCallEnd);
        vapi.off("error", onError);
        
        resolve(NextResponse.json(
          { success: false, error: "Interview failed" },
          { status: 500 }
        ));
      };

      // Set up event listeners
      vapi.on("message", onMessage);
      vapi.on("call-end", onCallEnd);
      vapi.on("error", onError);

      // Start the interview
      vapi.start(interviewer, {
        variableValues: {
          username: candidateData.ai.candidateName,
          userid: interviewData.candidateId,
          questions: "Please tell me about yourself and your experience.",
        },
      }).catch((error) => {
        console.error("Failed to start VAPI interview:", error);
        // Clean up event listeners
        vapi.off("message", onMessage);
        vapi.off("call-end", onCallEnd);
        vapi.off("error", onError);
        
        resolve(NextResponse.json(
          { success: false, error: "Failed to start interview" },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error("Interview runner error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
