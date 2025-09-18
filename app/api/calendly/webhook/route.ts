import { NextRequest, NextResponse } from "next/server";
import { db, isAdminReady } from "@/firebase/admin";
import crypto from "crypto";

// Update recruitment statistics in database
async function updateRecruitmentStatistics() {
  try {
    // Fetch current statistics
    const statsRef = db.collection("recruitment_stats").doc("current");
    const statsDoc = await statsRef.get();
    
    if (statsDoc.exists) {
      // Update existing statistics
      await statsRef.update({
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Create initial statistics document
      await statsRef.set({
        totalCandidates: 0,
        shortlistedCandidates: 0,
        interviewsCompleted: 0,
        interviewsScheduled: 0,
        totalRuns: 0,
        averageMatchScore: 0,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error updating recruitment statistics:", error);
    throw error;
  }
}

// Verify Calendly webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

// Schedule interview runner if within 72 hours
async function scheduleInterviewRunner(interviewId: string, scheduledAt: string) {
  const scheduledTime = new Date(scheduledAt);
  const now = new Date();
  const timeDiff = scheduledTime.getTime() - now.getTime();
  const hoursUntilInterview = timeDiff / (1000 * 60 * 60);

  if (hoursUntilInterview <= 72) {
    // Schedule immediate execution
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/interview/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || "internal-key"}`,
        },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        console.error("Failed to start interview runner:", await response.text());
      }
    } catch (error) {
      console.error("Error starting interview runner:", error);
    }
  } else {
    // For future interviews, you could implement a job queue here
    // For now, we'll just log it
    console.log(`Interview scheduled for ${scheduledAt}, will be processed later`);
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

    const body = await request.text();
    const signature = request.headers.get("calendly-webhook-signature");
    const webhookSecret = process.env.CALENDLY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is provided
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(body, signature, webhookSecret)) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body);

    // Handle event.created
    if (event.event === "invitee.created") {
      const { invitee, event_type } = event.payload;
      const candidateEmail = invitee.email;
      const scheduledAt = invitee.scheduled_event?.start_time;
      const calendlyEventUri = event_type.uri;

      if (!candidateEmail || !scheduledAt) {
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Find candidate by email
      const candidatesQuery = await db
        .collection("recruit_candidates")
        .where("email", "==", candidateEmail)
        .limit(1)
        .get();

      if (candidatesQuery.empty) {
        console.warn(`No candidate found for email: ${candidateEmail}`);
        return NextResponse.json({ success: true, message: "Candidate not found" });
      }

      const candidateDoc = candidatesQuery.docs[0];
      const candidateData = candidateDoc.data() as RecruitCandidate;
      const candidateId = candidateDoc.id;

      // Create interview document
      const interviewRef = db.collection("recruit_interviews").doc();
      const interviewId = interviewRef.id;

      const interviewData: RecruitInterview = {
        candidateId,
        candidateEmail,
        runId: candidateData.runId,
        scheduledAt,
        calendlyEventUri,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };

      await interviewRef.set(interviewData);

      // Update recruitment statistics
      try {
        await updateRecruitmentStatistics();
        console.log('Statistics updated after interview scheduling');
      } catch (error) {
        console.error('Error updating statistics after interview scheduling:', error);
      }

      // Schedule interview runner
      await scheduleInterviewRunner(interviewId, scheduledAt);

      return NextResponse.json({
        success: true,
        interviewId,
        message: "Interview scheduled successfully",
      });
    }

    return NextResponse.json({ success: true, message: "Event processed" });

  } catch (error) {
    console.error("Calendly webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
