"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

interface ShortlistedCandidate {
  id: string;
  candidateName: string;
  email: string;
  matchScore: number;
  runId: string;
  fileName: string;
  topSkills: string[];
  summary: string;
  createdAt: string;
}

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

// Utility function to clean up localStorage data
const cleanupLocalStorageData = () => {
  try {
    const storedRuns = localStorage.getItem('recruitRuns');
    const storedCandidates = localStorage.getItem('recruitCandidates');
    
    if (storedRuns) {
      const parsedRuns = JSON.parse(storedRuns);
      const uniqueRuns = parsedRuns.filter((run: RecruitRun, index: number, self: RecruitRun[]) => 
        index === self.findIndex((r: RecruitRun) => 
          r.id === run.id || 
          (r.createdAt === run.createdAt && r.jobDescription === run.jobDescription)
        )
      );
      
      if (uniqueRuns.length !== parsedRuns.length) {
        localStorage.setItem('recruitRuns', JSON.stringify(uniqueRuns));
        console.log('Cleaned up duplicate runs in localStorage');
      }
    }
  } catch (error) {
    console.error('Error cleaning up localStorage:', error);
  }
};

export default function ShortlistedCandidatesPage() {
  const [candidates, setCandidates] = useState<ShortlistedCandidate[]>([]);
  const [runs, setRuns] = useState<RecruitRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string>("all");

  useEffect(() => {
    // Clean up localStorage data first
    cleanupLocalStorageData();
    fetchShortlistedCandidates();
  }, []);

  const fetchShortlistedCandidates = async () => {
    try {
      // Get runs from localStorage
      const storedRuns = localStorage.getItem('recruitRuns');
      const storedCandidates = localStorage.getItem('recruitCandidates');
      
      if (storedRuns && storedCandidates) {
        const parsedRuns = JSON.parse(storedRuns);
        const parsedCandidates = JSON.parse(storedCandidates);
        
        console.log('Parsed candidates:', parsedCandidates);
        console.log('Sample candidate structure:', parsedCandidates[0]);
        
        // Remove duplicate runs based on ID and creation date
        const uniqueRuns = parsedRuns.filter((run: RecruitRun, index: number, self: RecruitRun[]) => 
          index === self.findIndex((r: RecruitRun) => 
            r.id === run.id || 
            (r.createdAt === run.createdAt && r.jobDescription === run.jobDescription)
          )
        );
        
        console.log('Original runs count:', parsedRuns.length);
        console.log('Unique runs count:', uniqueRuns.length);
        console.log('Unique runs:', uniqueRuns);
        
        // Debug: Show duplicate runs if any
        if (parsedRuns.length !== uniqueRuns.length) {
          console.log('Found duplicate runs. Original runs:', parsedRuns);
          console.log('Duplicate runs removed:', parsedRuns.length - uniqueRuns.length);
        }
        
        setRuns(uniqueRuns);
        
        // Filter only shortlisted candidates (those with match score >= 70%)
        const shortlistedCandidates = parsedCandidates.filter((candidate: any) => {
          const matchScore = candidate.matchScore || candidate.ai?.matchScore || 0;
          return matchScore >= 70;
        }).map((candidate: any) => ({
          ...candidate,
          candidateName: candidate.candidateName || candidate.ai?.candidateName || 'Unknown Candidate',
          email: candidate.email || candidate.ai?.email || 'No email provided',
          matchScore: candidate.matchScore || candidate.ai?.matchScore || 0,
          summary: candidate.summary || candidate.ai?.summary || 'No summary available',
          topSkills: candidate.topSkills || candidate.ai?.topSkills || []
        }));
        
        console.log('Shortlisted candidates:', shortlistedCandidates);
        console.log('Runs data:', uniqueRuns);
        console.log('Sample candidate runId:', shortlistedCandidates[0]?.runId);
        console.log('Sample run id:', uniqueRuns[0]?.id);
        setCandidates(shortlistedCandidates);
        
        // Update localStorage with deduplicated runs
        if (uniqueRuns.length !== parsedRuns.length) {
          localStorage.setItem('recruitRuns', JSON.stringify(uniqueRuns));
          console.log('Updated localStorage with deduplicated runs');
        }
      }
    } catch (error) {
      console.error("Error fetching shortlisted candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = selectedRun === "all" 
    ? candidates 
    : candidates.filter(candidate => {
        console.log('Filtering candidate:', candidate.runId, 'against selected run:', selectedRun);
        // Try exact match first, then try to find by run creation date if ID doesn't match
        if (candidate.runId === selectedRun) {
          return true;
        }
        
        // Fallback: try to match by finding the run and checking if this candidate belongs to it
        const run = runs.find(r => r.id === selectedRun);
        if (run) {
          // Check if this candidate was created around the same time as the run
          const candidateDate = new Date(candidate.createdAt);
          const runDate = new Date(run.createdAt);
          const timeDiff = Math.abs(candidateDate.getTime() - runDate.getTime());
          // If within 1 hour, consider it a match
          return timeDiff < 3600000; // 1 hour in milliseconds
        }
        
        return false;
      });

  const getRunById = (runId: string) => {
    return runs.find(run => run.id === runId);
  };

  if (loading) {
    return (
      <div className="flex-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200 mx-auto"></div>
          <p className="mt-4 text-light-100">Loading shortlisted candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
          Shortlisted Candidates
        </h1>
        <p className="text-sm sm:text-base lg:text-lg">
          View and manage candidates who have been shortlisted for interviews
        </p>
      </div>

      {/* Filter by Run */}
      <div className="card-border w-full sm:w-[90%] lg:w-[70%] mx-auto">
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <label className="text-light-100 font-medium text-sm sm:text-base">Filter by run:</label>
              <select
                value={selectedRun}
                onChange={(e) => setSelectedRun(e.target.value)}
                className="bg-dark-200 text-light-100 px-3 py-2 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm sm:text-base w-full sm:w-auto"
              >
                <option key="all" value="all">All Runs</option>
                {runs.map((run, index) => (
                  <option key={run.id || `run-${run.createdAt}-${index}`} value={run.id}>
                    {new Date(run.createdAt).toLocaleDateString()} - {run.shortlisted?.length || 0} shortlisted
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
              <div className="text-xs sm:text-sm text-light-100">
                Showing {filteredCandidates.length} of {candidates.length} shortlisted candidates
              </div>
              <Button
                onClick={() => {
                  cleanupLocalStorageData();
                  fetchShortlistedCandidates();
                }}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Clean Duplicates
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <div className="card-border w-full sm:w-[90%] lg:w-[70%] mx-auto">
          <div className="card p-6 sm:p-8 text-center">
            <Image src="/user-avatar.png" alt="No candidates" width={48} height={48} className="mx-auto mb-3 sm:mb-4 opacity-50 sm:w-16 sm:h-16" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No Shortlisted Candidates</h3>
            <p className="text-light-100 mb-4 sm:mb-6 text-sm sm:text-base">
              {selectedRun === "all" 
                ? "No candidates have been shortlisted yet. Upload some resumes to get started."
                : "No candidates were shortlisted in this run."
              }
            </p>
            <Link href="/recruit/upload">
              <Button className="btn-primary text-sm sm:text-base">
                Upload Resumes
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCandidates.map((candidate) => {
            const run = getRunById(candidate.runId);
            return (
              <div key={candidate.id} className="card-border">
                <div className="card p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-200 rounded-full flex items-center justify-center">
                        <span className="text-dark-100 font-bold text-sm sm:text-lg">
                          {(candidate.candidateName || candidate.ai?.candidateName || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-light-100 truncate">
                          {candidate.candidateName || candidate.ai?.candidateName || 'Unknown Candidate'}
                        </h3>
                        <p className="text-xs sm:text-sm text-light-100 truncate">
                          {candidate.email || candidate.ai?.email || 'No email provided'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:text-right">
                      <div className="text-xl sm:text-2xl font-bold text-success-100">
                        {candidate.matchScore || candidate.ai?.matchScore || 0}%
                      </div>
                      <div className="text-xs text-light-100">Match Score</div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-light-100 mb-1 sm:mb-2">Summary</h4>
                      <p className="text-xs sm:text-sm text-light-100 bg-dark-200 p-2 sm:p-3 rounded-md">
                        {candidate.summary || candidate.ai?.summary || 'No summary available'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-light-100 mb-1 sm:mb-2">Top Skills</h4>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {(candidate.topSkills || candidate.ai?.topSkills || []).slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-200 text-dark-100 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {(candidate.topSkills || candidate.ai?.topSkills || []).length > 5 && (
                          <span className="px-2 py-1 bg-dark-200 text-light-100 text-xs rounded-full">
                            +{(candidate.topSkills || candidate.ai?.topSkills || []).length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scoring Breakdown */}
                    {(candidate.ai?.scoringBreakdown || candidate.scoringBreakdown) && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-light-100 mb-2">Score Breakdown</h4>
                        <div className="space-y-2">
                          {Object.entries(candidate.ai?.scoringBreakdown || candidate.scoringBreakdown || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-xs text-light-100 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-dark-200 rounded-full h-2">
                                  <div 
                                    className="bg-primary-200 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${value}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-light-100 w-8 text-right">{value}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matched and Missing Skills */}
                    {(candidate.ai?.matchedSkills || candidate.matchedSkills) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <h4 className="text-xs sm:text-sm font-medium text-success-100 mb-1">Matched Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {(candidate.ai?.matchedSkills || candidate.matchedSkills || []).slice(0, 3).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-success-200 text-dark-100 text-xs rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {(candidate.ai?.matchedSkills || candidate.matchedSkills || []).length > 3 && (
                              <span className="px-2 py-1 bg-dark-200 text-light-100 text-xs rounded-full">
                                +{(candidate.ai?.matchedSkills || candidate.matchedSkills || []).length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-medium text-error-100 mb-1">Missing Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {(candidate.ai?.missingSkills || candidate.missingSkills || []).slice(0, 3).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-error-200 text-dark-100 text-xs rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {(candidate.ai?.missingSkills || candidate.missingSkills || []).length > 3 && (
                              <span className="px-2 py-1 bg-dark-200 text-light-100 text-xs rounded-full">
                                +{(candidate.ai?.missingSkills || candidate.missingSkills || []).length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Experience Level */}
                    {(candidate.ai?.experienceLevel || candidate.experienceLevel) && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-light-100 mb-1">Experience Level</h4>
                        <span className="px-2 py-1 bg-primary-200 text-dark-100 text-xs rounded-full">
                          {candidate.ai?.experienceLevel || candidate.experienceLevel}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 sm:pt-3 border-t border-dark-200">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-light-100 gap-1 sm:gap-0">
                        <span className="truncate">From: {candidate.fileName}</span>
                        <span>{new Date(candidate.createdAt).toLocaleDateString()}</span>
                      </div>
                      {run && (
                        <div className="text-xs text-light-100 mt-1">
                          Run: {new Date(run.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2">
                    <Button 
                      className="btn-primary flex-1 text-xs sm:text-sm"
                      onClick={() => {
                        // TODO: Implement interview scheduling
                        alert('Interview scheduling feature coming soon!');
                      }}
                    >
                      Schedule Interview
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => {
                        // TODO: Implement view full resume
                        alert('Full resume view feature coming soon!');
                      }}
                    >
                      View Resume
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back to Dashboard */}
      <div className="text-center">
        <Link href="/recruit/dashboard">
          <Button variant="outline" className="text-sm sm:text-base">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
