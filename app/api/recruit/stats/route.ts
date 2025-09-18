import { NextRequest, NextResponse } from "next/server";
import { db, isAdminReady } from "@/firebase/admin";

interface RecruitmentStats {
  totalCandidates: number;
  shortlistedCandidates: number;
  interviewsCompleted: number;
  interviewsScheduled: number;
  totalRuns: number;
  averageMatchScore: number;
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminReady()) {
      // Try to get data from localStorage via the dashboard API
      try {
        const dashboardResponse = await fetch(`${request.nextUrl.origin}/api/recruit/dashboard`);
        const dashboardData = await dashboardResponse.json();
        
        if (dashboardData.success) {
          const runs = dashboardData.runs || [];
          const interviews = dashboardData.interviews || [];
          
          // Calculate statistics from localStorage data
          const totalCandidates = runs.reduce((sum: number, run: any) => sum + (run.total || 0), 0);
          const shortlistedCandidates = runs.reduce((sum: number, run: any) => sum + (run.shortlisted?.length || 0), 0);
          const interviewsCompleted = interviews.filter((interview: any) => interview.status === "completed").length;
          const interviewsScheduled = interviews.filter((interview: any) => 
            interview.status === "scheduled" || interview.status === "in_progress"
          ).length;
          const totalRuns = runs.length;
          
          // Calculate average match score for shortlisted candidates
          const allShortlisted = runs.flatMap((run: any) => run.shortlisted || []);
          const averageMatchScore = allShortlisted.length > 0 
            ? allShortlisted.reduce((sum: number, candidate: any) => sum + (candidate.matchScore || 0), 0) / allShortlisted.length
            : 0;
          
          return NextResponse.json({
            success: true,
            stats: {
              totalCandidates,
              shortlistedCandidates,
              interviewsCompleted,
              interviewsScheduled,
              totalRuns,
              averageMatchScore: Math.round(averageMatchScore * 100) / 100,
              lastUpdated: new Date().toISOString()
            },
            message: "Using localStorage data - Firebase not configured"
          });
        }
      } catch (error) {
        console.log("Could not fetch localStorage data:", error);
      }
      
      // Return demo data when Firebase is not configured and localStorage is not available
      return NextResponse.json({
        success: true,
        stats: {
          totalCandidates: 0,
          shortlistedCandidates: 0,
          interviewsCompleted: 0,
          interviewsScheduled: 0,
          totalRuns: 0,
          averageMatchScore: 0,
          lastUpdated: new Date().toISOString()
        },
        message: "Demo mode - Firebase not configured"
      });
    }

    // Fetch all candidates
    const candidatesSnapshot = await db.collection("recruit_candidates").get();
    const allCandidates = candidatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch all interviews
    const interviewsSnapshot = await db.collection("recruit_interviews").get();
    const allInterviews = interviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch all runs
    const runsSnapshot = await db.collection("recruit_runs").get();
    const allRuns = runsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate statistics
    const totalCandidates = allCandidates.length;
    
    // Count shortlisted candidates (match score >= 70)
    const shortlistedCandidates = allCandidates.filter(candidate => {
      const matchScore = candidate.matchScore || candidate.ai?.matchScore || 0;
      return matchScore >= 70;
    }).length;

    // Count completed interviews
    const interviewsCompleted = allInterviews.filter(interview => 
      interview.status === "completed"
    ).length;

    // Count scheduled interviews (scheduled + in_progress)
    const interviewsScheduled = allInterviews.filter(interview => 
      interview.status === "scheduled" || interview.status === "in_progress"
    ).length;

    const totalRuns = allRuns.length;

    // Calculate average match score for shortlisted candidates
    const shortlistedWithScores = allCandidates.filter(candidate => {
      const matchScore = candidate.matchScore || candidate.ai?.matchScore || 0;
      return matchScore >= 70;
    });
    
    const averageMatchScore = shortlistedWithScores.length > 0 
      ? shortlistedWithScores.reduce((sum, candidate) => {
          const matchScore = candidate.matchScore || candidate.ai?.matchScore || 0;
          return sum + matchScore;
        }, 0) / shortlistedWithScores.length
      : 0;

    const stats: RecruitmentStats = {
      totalCandidates,
      shortlistedCandidates,
      interviewsCompleted,
      interviewsScheduled,
      totalRuns,
      averageMatchScore: Math.round(averageMatchScore * 100) / 100, // Round to 2 decimal places
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Error fetching recruitment statistics:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch statistics: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
