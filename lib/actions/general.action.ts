"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db, isAdminReady } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    if (!isAdminReady()) {
      console.warn("[feedback] Admin not configured; skipping save.");
      return { success: false };
    }
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    try {
      await feedbackRef.set(feedback);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isCred = msg.includes('Getting metadata from plugin failed') || msg.includes('DECODER routines::unsupported');
      if (isCred) {
        console.warn("[feedback] Skipping Firestore write due to admin credential error.");
        return { success: false };
      }
      throw err;
    }

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  if (!isAdminReady()) return null;
  try {
    const interview = await db.collection("interviews").doc(id).get();
    return interview.data() as Interview | null;
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isCred = msg.includes('Getting metadata from plugin failed') || msg.includes('DECODER routines::unsupported');
    if (isCred) return null;
    throw err;
  }
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;
  if (!isAdminReady()) return null;
  try {
    const querySnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (querySnapshot.empty) return null;

    const feedbackDoc = querySnapshot.docs[0];
    return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isCred = msg.includes('Getting metadata from plugin failed') || msg.includes('DECODER routines::unsupported');
    if (isCred) return null;
    throw err;
  }
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const toMs = (value: any) => {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  };

  try {
    if (!isAdminReady()) return [];
    // Avoid the Firestore inequality ("!=") on userId to prevent multi-field range issues.
    const snapshot = await db
      .collection("interviews")
      .where("finalized", "==", true)
      .orderBy("createdAt", "desc")
      .limit(Math.max(limit * 2, limit))
      .get();

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() })) as Interview[];

    const filtered = items.filter((it: any) => it.userId !== userId);
    return filtered.slice(0, limit);
  } catch (error: any) {
    const msg = String(error?.message || error);
    const isCred = msg.includes('Getting metadata from plugin failed') || msg.includes('DECODER routines::unsupported');
    if (isCred) return [];
    const isMissingIndex =
      (error && error.code === 9) ||
      (typeof error?.message === "string" &&
        error.message.includes("FAILED_PRECONDITION"));

    if (!isMissingIndex) throw error;

    // Fallback: fetch without orderBy and sort/filter in-memory
    const fallback = await db
      .collection("interviews")
      .where("finalized", "==", true)
      .limit(Math.max(limit * 3, limit))
      .get();

    const items = (fallback.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[]).sort((a: any, b: any) => toMs(b.createdAt) - toMs(a.createdAt));

    const filtered = items.filter((it: any) => it.userId !== userId);
    return filtered.slice(0, limit);
  }
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  try {
    if (!isAdminReady()) return [];
    const interviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return interviews.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
  } catch (error: any) {
    const msg = String(error?.message || error);
    const isCred = msg.includes('Getting metadata from plugin failed') || msg.includes('DECODER routines::unsupported');
    if (isCred) return [];
    const isMissingIndex =
      (error && error.code === 9) ||
      (typeof error?.message === "string" &&
        error.message.includes("FAILED_PRECONDITION"));

    if (!isMissingIndex) throw error;

    // Fallback: fetch without orderBy and sort in-memory by createdAt desc
    const fallback = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    const items = fallback.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];

    const toMs = (value: any) => {
      if (!value) return 0;
      if (typeof value?.toDate === "function") return value.toDate().getTime();
      const t = Date.parse(value);
      return Number.isNaN(t) ? 0 : t;
    };

    items.sort((a: any, b: any) => toMs(b.createdAt) - toMs(a.createdAt));
    return items;
  }
}
