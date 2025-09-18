"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RecruitRun {
  id: string;
  jobDescription: string;
  createdAt: string;
  total: number;
  shortlisted: Array<{
    id: string;
    candidateName: string;
    email: string;
    matchScore: number;
  }>;
  runStatus: "processing" | "completed" | "failed";
}

interface RecruitInterview {
  id: string;
  candidateEmail: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed" | "failed";
  report?: {
    overallScore: number;
    recommendedNextStep: "onsite" | "hr" | "reject";
  };
}

export default function RecruitDashboardPage() {
  const [runs, setRuns] = useState<RecruitRun[]>([]);
  const [interviews, setInterviews] = useState<RecruitInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Check localStorage first for demo mode
      const storedRuns = localStorage.getItem('recruitRuns');
      const storedInterviews = localStorage.getItem('recruitInterviews');
      
      console.log('Checking localStorage first');
      console.log('Stored runs:', storedRuns);
      console.log('Stored interviews:', storedInterviews);
      
      if (storedRuns || storedInterviews) {
        // Use localStorage data if available
        if (storedRuns) {
          const parsedRuns = JSON.parse(storedRuns);
          console.log('Using localStorage runs:', parsedRuns);
          setRuns(parsedRuns);
        }
        if (storedInterviews) {
          const parsedInterviews = JSON.parse(storedInterviews);
          console.log('Using localStorage interviews:', parsedInterviews);
          setInterviews(parsedInterviews);
        }
        setLoading(false);
        return;
      }
      
      // Fallback to API if no localStorage data
      console.log('No localStorage data, trying API');
      const response = await fetch('/api/recruit/dashboard');
      const data = await response.json();
      
      if (data.success) {
        console.log('API returned data:', data);
        setRuns(data.runs || []);
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200 mx-auto"></div>
          <p className="mt-4 text-light-100">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
          Recruitment Dashboard
        </h1>
        <p className="text-sm sm:text-base lg:text-lg">
          Manage your AI-powered recruitment pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Upload New Resumes */}
        <div className="card-border h-full">
          <div className="card p-4 sm:p-6 h-full flex flex-col">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Start New Recruitment
            </h2>
            <p className="text-light-100 mb-4 sm:mb-6 flex-grow text-sm sm:text-base">
              Upload resumes and job descriptions to begin AI-powered candidate screening.
            </p>
            <Link href="/recruit/upload">
              <Button className="btn-primary w-full text-sm sm:text-base">
                Upload Resumes
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="card-border h-full">
          <div className="card p-4 sm:p-6 h-full flex flex-col">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Recent Runs
            </h2>
            <div className="flex-grow">
              {runs.length === 0 ? (
                <p className="text-light-100 text-xs sm:text-sm">No recruitment runs yet</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {runs.slice(0, 3).map((run, index) => (
                    <div key={run.id || `run-${index}`} className="bg-dark-200 rounded-lg p-2 sm:p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-light-100">
                            {run.total} candidates processed
                          </p>
                          <p className="text-xs text-light-100">
                            {new Date(run.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full self-start ${
                          run.runStatus === "completed" 
                            ? "bg-success-100 text-dark-100"
                            : run.runStatus === "processing"
                            ? "bg-primary-200 text-dark-100"
                            : "bg-destructive-100 text-white"
                        }`}>
                          {run.runStatus}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-2">
                        <p className="text-xs sm:text-sm text-light-100">
                          {run.shortlisted.length} shortlisted
                        </p>
                        {run.shortlisted.length > 0 && (
                          <Link href="/recruit/shortlisted">
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                              View Shortlisted
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="card-border h-full sm:col-span-2 lg:col-span-1">
          <div className="card p-4 sm:p-6 h-full flex flex-col">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Upcoming Interviews
            </h2>
            <div className="flex-grow">
              {interviews.length === 0 ? (
                <p className="text-light-100 text-xs sm:text-sm">No interviews scheduled</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {interviews.slice(0, 3).map((interview, index) => (
                    <div key={interview.id || `interview-${index}`} className="bg-dark-200 rounded-lg p-2 sm:p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-light-100">
                            {interview.candidateEmail}
                          </p>
                          <p className="text-xs text-light-100">
                            {new Date(interview.scheduledAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full self-start ${
                          interview.status === "completed" 
                            ? "bg-success-100 text-dark-100"
                            : interview.status === "in_progress"
                            ? "bg-primary-200 text-dark-100"
                            : interview.status === "scheduled"
                            ? "bg-primary-200 text-dark-100"
                            : "bg-destructive-100 text-white"
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      {interview.report && (
                        <p className="text-xs sm:text-sm text-light-100 mt-1">
                          Score: {interview.report.overallScore}/100
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="card-border h-full">
          <div className="card p-3 sm:p-4 lg:p-6 text-center h-full flex flex-col justify-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-200 mb-1 sm:mb-2">
              {runs.reduce((sum, run) => sum + run.total, 0)}
            </div>
            <div className="text-xs sm:text-sm text-light-100">Total Candidates</div>
          </div>
        </div>
        
        <div className="card-border h-full">
          <div className="card p-3 sm:p-4 lg:p-6 text-center h-full flex flex-col justify-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-success-100 mb-1 sm:mb-2">
              {runs.reduce((sum, run) => sum + run.shortlisted.length, 0)}
            </div>
            <div className="text-xs sm:text-sm text-light-100">Shortlisted</div>
          </div>
        </div>
        
        <div className="card-border h-full">
          <div className="card p-3 sm:p-4 lg:p-6 text-center h-full flex flex-col justify-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-200 mb-1 sm:mb-2">
              {interviews.filter(i => i.status === "completed").length}
            </div>
            <div className="text-xs sm:text-sm text-light-100">Interviews Completed</div>
          </div>
        </div>
        
        <div className="card-border h-full">
          <div className="card p-3 sm:p-4 lg:p-6 text-center h-full flex flex-col justify-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-200 mb-1 sm:mb-2">
              {interviews.filter(i => i.status === "scheduled").length}
            </div>
            <div className="text-xs sm:text-sm text-light-100">Scheduled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
