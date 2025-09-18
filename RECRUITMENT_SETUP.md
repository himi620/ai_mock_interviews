# AI-Powered Recruitment Pipeline Setup

This document explains how to set up and use the AI-powered recruitment pipeline feature.

## Features

- **Resume Upload & Processing**: Upload up to 10 resume files (PDF, DOC, DOCX, TXT)
- **AI Analysis**: Uses Google Gemini to extract candidate information and score fit against job descriptions
- **Automatic Shortlisting**: AI recommends candidates based on match scores
- **Email Notifications**: Automatically sends Calendly links to shortlisted candidates
- **Interview Scheduling**: Calendly webhook integration for interview scheduling
- **AI Interview Execution**: Automated VAPI interviews for scheduled candidates
- **Interview Reports**: AI-generated interview feedback and recommendations

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Firebase Configuration (already configured)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# VAPI Configuration (already configured)
NEXT_PUBLIC_VAPI_WEB_TOKEN=your-vapi-web-token
NEXT_PUBLIC_VAPI_WORKFLOW_ID=your-workflow-id

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@yourcompany.com

# Calendly Integration
NEXT_PUBLIC_CALENDLY_LINK=https://calendly.com/your-company/interview
CALENDLY_WEBHOOK_SECRET=your-webhook-secret

# Internal API Security
INTERNAL_API_KEY=your-internal-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup Instructions

### 1. Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App passwords
3. Use the app password as `SMTP_PASS`

### 2. Calendly Integration

1. Create a Calendly account and set up your interview event type
2. Get your Calendly link and add it to `NEXT_PUBLIC_CALENDLY_LINK`
3. Set up webhook: Calendly → Integrations → Webhooks
4. Use webhook URL: `https://yourdomain.com/api/calendly/webhook`
5. Add webhook secret to `CALENDLY_WEBHOOK_SECRET`

### 3. Google Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add it to `GOOGLE_GENERATIVE_AI_API_KEY`

## Usage

### 1. Upload Resumes

1. Navigate to `/recruit/upload`
2. Enter job description
3. Upload resume files (max 10)
4. Click "Process Resumes"

### 2. View Dashboard

1. Navigate to `/recruit/dashboard`
2. View recruitment runs, shortlisted candidates, and interview status

### 3. Interview Flow

1. Shortlisted candidates receive email with Calendly link
2. When they schedule, Calendly webhook creates interview record
3. If scheduled within 72 hours, VAPI interview starts automatically
4. Interview transcript and recording are saved
5. AI generates interview report
6. Admin and candidate receive follow-up emails

## API Endpoints

### POST /api/resume/process
Process uploaded resumes and generate candidate analysis.

**Body**: FormData with:
- `jobDescription`: string
- `file_0`, `file_1`, etc.: File objects

**Response**:
```json
{
  "success": true,
  "runId": "string",
  "totalProcessed": number,
  "shortlisted": number
}
```

### POST /api/calendly/webhook
Handle Calendly webhook events for interview scheduling.

**Headers**:
- `calendly-webhook-signature`: HMAC signature for verification

**Body**: Calendly webhook payload

### POST /api/interview/run
Execute VAPI interview for scheduled candidate.

**Headers**:
- `Authorization`: Bearer token for internal API access

**Body**:
```json
{
  "interviewId": "string"
}
```

## Firestore Collections

### recruit_runs
```typescript
{
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
```

### recruit_candidates
```typescript
{
  runId: string;
  fileName: string;
  textSnippet: string;
  ai: {
    candidateName: string;
    email: string | null;
    topSkills: string[];
    summary: string;
    matchScore: number;
    recommended: "yes" | "no";
  };
  email: string | null;
  createdAt: string;
}
```

### recruit_interviews
```typescript
{
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
```

## Troubleshooting

### Common Issues

1. **PDF parsing fails**: Ensure `pdf-parse` is installed and files are valid PDFs
2. **Email sending fails**: Check SMTP credentials and app password
3. **VAPI interview doesn't start**: Verify VAPI tokens and workflow ID
4. **Calendly webhook not working**: Check webhook URL and signature verification

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check console logs for detailed error messages.

## Security Notes

- All API endpoints validate authentication and authorization
- Calendly webhook signature verification prevents unauthorized access
- Internal API endpoints require bearer token authentication
- File uploads are validated for type and size limits
