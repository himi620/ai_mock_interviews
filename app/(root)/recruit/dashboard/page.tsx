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
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Recruitment Dashboard
        </h1>
        <p className="text-lg">
          Manage your AI-powered recruitment pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload New Resumes */}
        <div className="card-border">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">
              Start New Recruitment
            </h2>
            <p className="text-light-100 mb-6">
              Upload resumes and job descriptions to begin AI-powered candidate screening.
            </p>
            <Link href="/recruit/upload">
              <Button className="btn-primary w-full">
                Upload Resumes
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="card-border">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">
              Recent Runs
            </h2>
            {runs.length === 0 ? (
              <p className="text-light-100 text-sm">No recruitment runs yet</p>
            ) : (
              <div className="space-y-3">
                {runs.slice(0, 3).map((run, index) => (
                  <div key={run.id || `run-${index}`} className="bg-dark-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-light-100">
                          {run.total} candidates processed
                        </p>
                        <p className="text-xs text-light-100">
                          {new Date(run.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        run.runStatus === "completed" 
                          ? "bg-success-100 text-dark-100"
                          : run.runStatus === "processing"
                          ? "bg-primary-200 text-dark-100"
                          : "bg-destructive-100 text-white"
                      }`}>
                        {run.runStatus}
                      </span>
                    </div>
                    <p className="text-sm text-light-100 mt-1">
                      {run.shortlisted.length} shortlisted
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="card-border">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">
              Upcoming Interviews
            </h2>
            {interviews.length === 0 ? (
              <p className="text-light-100 text-sm">No interviews scheduled</p>
            ) : (
              <div className="space-y-3">
                {interviews.slice(0, 3).map((interview, index) => (
                  <div key={interview.id || `interview-${index}`} className="bg-dark-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-light-100">
                          {interview.candidateEmail}
                        </p>
                        <p className="text-xs text-light-100">
                          {new Date(interview.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
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
                      <p className="text-sm text-light-100 mt-1">
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-border">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-200 mb-2">
              {runs.reduce((sum, run) => sum + run.total, 0)}
            </div>
            <div className="text-sm text-light-100">Total Candidates</div>
          </div>
        </div>
        
        <div className="card-border">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-success-100 mb-2">
              {runs.reduce((sum, run) => sum + run.shortlisted.length, 0)}
            </div>
            <div className="text-sm text-light-100">Shortlisted</div>
          </div>
        </div>
        
        <div className="card-border">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-200 mb-2">
              {interviews.filter(i => i.status === "completed").length}
            </div>
            <div className="text-sm text-light-100">Interviews Completed</div>
          </div>
        </div>
        
        <div className="card-border">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-200 mb-2">
              {interviews.filter(i => i.status === "scheduled").length}
            </div>
            <div className="text-sm text-light-100">Scheduled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
