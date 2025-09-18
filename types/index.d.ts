interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
}

interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

// Recruitment-related interfaces
interface CandidateInfo {
  candidateName: string;
  email: string | null;
  topSkills: string[];
  summary: string;
  matchScore: number;
  recommended: "yes" | "no";
  scoringBreakdown: {
    skillsMatch: number;
    experienceMatch: number;
    roleAlignment: number;
    educationMatch: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  experienceLevel: string;
  detailedFeedback: {
    strengths: string[];
    weaknesses: string[];
    specificGaps: string[];
    recommendations: string[];
    scoreExplanation: string;
  };
}

interface RecruitRun {
  id?: string;
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

interface RecruitCandidate {
  id?: string;
  runId: string;
  fileName: string;
  textSnippet: string;
  ai: CandidateInfo;
  email: string | null;
  createdAt: string;
}

interface RecruitInterview {
  id?: string;
  candidateId: string;
  candidateEmail: string;
  runId: string;
  scheduledAt: string;
  calendlyEventUri?: string;
  vapiSessionId?: string;
  transcript?: Array<{ role: string; content: string }>;
  recordingUrl?: string;
  report?: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendedNextStep: "onsite" | "hr" | "reject";
    detailedNotes: string;
  };
  status: "scheduled" | "in_progress" | "completed" | "failed";
  createdAt: string;
}

interface ProcessResumeResponse {
  success: boolean;
  runId?: string;
  error?: string;
}

// Recruitment Statistics
interface RecruitmentStats {
  totalCandidates: number;
  shortlistedCandidates: number;
  interviewsCompleted: number;
  interviewsScheduled: number;
  totalRuns: number;
  averageMatchScore: number;
  lastUpdated: string;
}

interface StatsResponse {
  success: boolean;
  stats: RecruitmentStats;
  message?: string;
}
