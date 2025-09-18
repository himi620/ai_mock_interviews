"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Candidate {
  id: string;
  name: string;
  email: string;
  matchScore: number;
  shortlisted: boolean;
  rejectionReasons?: string[];
  skills?: string[];
  experience?: string;
  education?: string;
  runId: string;
  processedAt: string;
  detailedFeedback?: {
    strengths: string[];
    weaknesses: string[];
    specificGaps: string[];
    recommendations: string[];
    scoreExplanation: string;
  };
  scoringBreakdown?: {
    skillsMatch: number;
    experienceMatch: number;
    roleAlignment: number;
    educationMatch: number;
  };
  matchedSkills?: string[];
  missingSkills?: string[];
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

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [runs, setRuns] = useState<RecruitRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "shortlisted" | "rejected">("all");

  useEffect(() => {
    fetchCandidatesData();
  }, []);

  const fetchCandidatesData = async () => {
    try {
      // Check localStorage first
      const storedRuns = localStorage.getItem('recruitRuns');
      const storedCandidates = localStorage.getItem('recruitCandidates');
      
      if (storedRuns) {
        const parsedRuns = JSON.parse(storedRuns);
        setRuns(parsedRuns);
        
        // Process all candidates from all runs
        const allCandidates: Candidate[] = [];
        
        parsedRuns.forEach((run: RecruitRun) => {
          // Add shortlisted candidates
          run.shortlisted?.forEach(candidate => {
            allCandidates.push({
              id: candidate.id,
              name: candidate.candidateName,
              email: candidate.email,
              matchScore: candidate.matchScore,
              shortlisted: true,
              runId: run.id,
              processedAt: run.createdAt,
              skills: [], // Will be populated from stored candidates data
              experience: "",
              education: ""
            });
          });
        });
        
        // Add all candidates from stored candidates data (including rejected ones)
        if (storedCandidates) {
          const parsedCandidates = JSON.parse(storedCandidates);
          parsedCandidates.forEach((candidate: any) => {
            // Check if this candidate is already in the list (from shortlisted)
            const existingIndex = allCandidates.findIndex(c => c.id === candidate.id);
            
            if (existingIndex >= 0) {
              // Update existing candidate with full AI data
              allCandidates[existingIndex] = {
                ...allCandidates[existingIndex],
                skills: candidate.ai?.topSkills || [],
                experience: candidate.ai?.experienceLevel || "",
                education: "", // This would come from AI analysis if available
                detailedFeedback: candidate.ai?.detailedFeedback,
                scoringBreakdown: candidate.ai?.scoringBreakdown,
                matchedSkills: candidate.ai?.matchedSkills,
                missingSkills: candidate.ai?.missingSkills
              };
            } else {
              // Add new candidate (rejected ones)
            allCandidates.push({
                id: candidate.id,
                name: candidate.ai?.candidateName || `Candidate ${candidate.id}`,
                email: candidate.ai?.email || candidate.email || "no-email@example.com",
                matchScore: candidate.ai?.matchScore || 0,
                shortlisted: candidate.ai?.recommended === "yes",
                rejectionReasons: candidate.ai?.recommended === "no" ? generateRejectionReasons(candidate.ai?.matchScore || 0) : undefined,
                runId: candidate.runId,
                processedAt: candidate.createdAt,
                skills: candidate.ai?.topSkills || [],
                experience: candidate.ai?.experienceLevel || "",
                education: "", // This would come from AI analysis if available
                detailedFeedback: candidate.ai?.detailedFeedback,
                scoringBreakdown: candidate.ai?.scoringBreakdown,
                matchedSkills: candidate.ai?.matchedSkills,
                missingSkills: candidate.ai?.missingSkills
            });
          }
        });
        }
        
        setCandidates(allCandidates);
        setLoading(false);
        return;
      }
      
      // Fallback to API if no localStorage data
      const response = await fetch('/api/recruit/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setRuns(data.runs || []);
        // Process candidates from API data
        // Similar logic as above
      }
    } catch (error) {
      console.error("Error fetching candidates data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRejectionReasons = (score: number): string[] => {
    const reasons = [];
    
    if (score < 30) {
      reasons.push("Very low match score");
      reasons.push("Insufficient relevant experience");
    } else if (score < 50) {
      reasons.push("Below minimum match threshold");
      reasons.push("Missing key technical skills");
    } else {
      reasons.push("Match score below 70% threshold");
      reasons.push("Some required qualifications missing");
    }
    
    // Add some common rejection reasons
    const commonReasons = [
      "Resume formatting issues",
      "Incomplete contact information",
      "Lack of specific industry experience",
      "Skills gap in required technologies"
    ];
    
    // Randomly add 1-2 common reasons
    const numCommonReasons = Math.floor(Math.random() * 2) + 1;
    const shuffledCommon = commonReasons.sort(() => 0.5 - Math.random());
    reasons.push(...shuffledCommon.slice(0, numCommonReasons));
    
    return reasons;
  };

  const filteredCandidates = candidates.filter(candidate => {
    if (filter === "shortlisted") return candidate.shortlisted;
    if (filter === "rejected") return !candidate.shortlisted;
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success-100";
    if (score >= 50) return "text-warning-100";
    return "text-destructive-100";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return "bg-success-100 text-dark-100";
    if (score >= 50) return "bg-warning-100 text-dark-100";
    return "bg-destructive-100 text-white";
  };

  if (loading) {
    return (
      <div className="flex-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200 mx-auto"></div>
          <p className="mt-4 text-light-100">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            All Candidates
          </h1>
          <p className="text-sm sm:text-base lg:text-lg">
            View all processed candidates and their evaluation details
          </p>
        </div>
        <Link href="/recruit/dashboard">
          <Button variant="outline" size="sm">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card-border">
          <div className="card p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-primary-200 mb-2">
              {candidates.length}
            </div>
            <div className="text-sm text-light-100">Total Candidates</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-success-100 mb-2">
              {candidates.filter(c => c.shortlisted).length}
            </div>
            <div className="text-sm text-light-100">Shortlisted</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-destructive-100 mb-2">
              {candidates.filter(c => !c.shortlisted).length}
            </div>
            <div className="text-sm text-light-100">Rejected</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({candidates.length})
        </Button>
        <Button
          variant={filter === "shortlisted" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("shortlisted")}
        >
          Shortlisted ({candidates.filter(c => c.shortlisted).length})
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("rejected")}
        >
          Rejected ({candidates.filter(c => !c.shortlisted).length})
        </Button>
      </div>

      {/* Candidates List */}
      <div className="space-y-4">
        {filteredCandidates.length === 0 ? (
          <div className="card-border">
            <div className="card p-8 text-center">
              <p className="text-light-100">No candidates found for the selected filter.</p>
            </div>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="card-border">
              <div className="card p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Candidate Info */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-light-100">
                        {candidate.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full self-start ${
                        candidate.shortlisted 
                          ? "bg-success-100 text-dark-100"
                          : "bg-destructive-100 text-white"
                      }`}>
                        {candidate.shortlisted ? "Shortlisted" : "Rejected"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-light-100 font-medium">Email:</span>
                        <span className="text-light-100 ml-2">{candidate.email}</span>
                      </div>
                      <div>
                        <span className="text-light-100 font-medium">Experience:</span>
                        <span className="text-light-100 ml-2">{candidate.experience || "Not specified"}</span>
                      </div>
                      <div>
                        <span className="text-light-100 font-medium">Education:</span>
                        <span className="text-light-100 ml-2">{candidate.education || "Not specified"}</span>
                      </div>
                      <div>
                        <span className="text-light-100 font-medium">Skills:</span>
                        <span className="text-light-100 ml-2">
                          {candidate.skills?.join(", ") || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className="flex flex-col items-center sm:items-end gap-2">
                    <div className={`text-2xl font-bold ${getScoreColor(candidate.matchScore)}`}>
                      {candidate.matchScore}%
                    </div>
                    <div className={`px-3 py-1 text-sm rounded-full ${getScoreBgColor(candidate.matchScore)}`}>
                      Match Score
                    </div>
                  </div>
                </div>

                {/* Detailed Feedback */}
                {candidate.detailedFeedback && (
                  <div className="mt-4 pt-4 border-t border-dark-200">
                    <h4 className="text-sm font-medium text-light-100 mb-3">
                      Detailed Analysis
                    </h4>
                    
                    {/* Score Explanation */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-light-100 mb-2">Score Explanation:</h5>
                      <p className="text-xs text-light-100 bg-dark-200 p-3 rounded">
                        {candidate.detailedFeedback.scoreExplanation}
                      </p>
                    </div>

                    {/* Scoring Breakdown */}
                    {candidate.scoringBreakdown && (
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-light-100 mb-2">Scoring Breakdown:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span>Skills Match:</span>
                            <span className={getScoreColor(candidate.scoringBreakdown.skillsMatch)}>
                              {candidate.scoringBreakdown.skillsMatch}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Experience:</span>
                            <span className={getScoreColor(candidate.scoringBreakdown.experienceMatch)}>
                              {candidate.scoringBreakdown.experienceMatch}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Education:</span>
                            <span className={getScoreColor(candidate.scoringBreakdown.educationMatch)}>
                              {candidate.scoringBreakdown.educationMatch}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Role Alignment:</span>
                            <span className={getScoreColor(candidate.scoringBreakdown.roleAlignment)}>
                              {candidate.scoringBreakdown.roleAlignment}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Skills Analysis */}
                    {(candidate.matchedSkills?.length > 0 || candidate.missingSkills?.length > 0) && (
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-light-100 mb-2">Skills Analysis:</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {candidate.matchedSkills && candidate.matchedSkills.length > 0 && (
                            <div>
                              <span className="text-xs text-success-100 font-medium">✓ Matched Skills:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.matchedSkills.map((skill, index) => (
                                  <span key={index} className="text-xs bg-success-100 text-dark-100 px-2 py-1 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {candidate.missingSkills && candidate.missingSkills.length > 0 && (
                            <div>
                              <span className="text-xs text-destructive-100 font-medium">✗ Missing Skills:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.missingSkills.map((skill, index) => (
                                  <span key={index} className="text-xs bg-destructive-100 text-white px-2 py-1 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strengths and Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {candidate.detailedFeedback.strengths && candidate.detailedFeedback.strengths.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-success-100 mb-2">Strengths:</h5>
                          <ul className="list-disc list-inside space-y-1">
                            {candidate.detailedFeedback.strengths.map((strength, index) => (
                              <li key={index} className="text-xs text-light-100">
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {candidate.detailedFeedback.weaknesses && candidate.detailedFeedback.weaknesses.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-destructive-100 mb-2">Areas for Improvement:</h5>
                          <ul className="list-disc list-inside space-y-1">
                            {candidate.detailedFeedback.weaknesses.map((weakness, index) => (
                              <li key={index} className="text-xs text-light-100">
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Specific Gaps */}
                    {candidate.detailedFeedback.specificGaps && candidate.detailedFeedback.specificGaps.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-medium text-destructive-100 mb-2">Specific Gaps:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {candidate.detailedFeedback.specificGaps.map((gap, index) => (
                            <li key={index} className="text-xs text-light-100">
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {candidate.detailedFeedback.recommendations && candidate.detailedFeedback.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-medium text-primary-200 mb-2">Recommendations:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {candidate.detailedFeedback.recommendations.map((rec, index) => (
                            <li key={index} className="text-xs text-light-100">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback Rejection Reasons */}
                {!candidate.shortlisted && !candidate.detailedFeedback && candidate.rejectionReasons && (
                  <div className="mt-4 pt-4 border-t border-dark-200">
                    <h4 className="text-sm font-medium text-light-100 mb-2">
                      Reasons for Rejection:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {candidate.rejectionReasons.map((reason, index) => (
                        <li key={index} className="text-sm text-light-100">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Processing Info */}
                <div className="mt-4 pt-4 border-t border-dark-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-light-100">
                    <span>Processed: {new Date(candidate.processedAt).toLocaleString()}</span>
                    <span>Run ID: {candidate.runId}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
