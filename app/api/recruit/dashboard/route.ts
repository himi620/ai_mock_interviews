import { NextRequest, NextResponse } from "next/server";
import { db, isAdminReady } from "@/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminReady()) {
      // Return demo data when Firebase is not configured
      return NextResponse.json({
        success: true,
        runs: [],
        interviews: [],
        message: "Demo mode - Firebase not configured"
      });
    }

    // Fetch recruitment runs from Firebase
    const runsSnapshot = await db.collection("recruit_runs").orderBy("createdAt", "desc").get();
    const runs = runsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch interviews from Firebase
    const interviewsSnapshot = await db.collection("recruit_interviews").orderBy("createdAt", "desc").get();
    const interviews = interviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      runs,
      interviews
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
