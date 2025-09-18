# AI Mock Interviews

A modern job interview preparation platform powered by AI voice agents and advanced interview simulation technology.

## 🚀 Features

- **AI-Powered Interviews**: Conduct realistic mock interviews with AI voice agents
- **Real-time Feedback**: Get instant, detailed feedback on your interview performance
- **Multiple Tech Stacks**: Practice interviews for various programming languages and frameworks
- **Customizable Questions**: Generate questions based on job role, experience level, and focus area
- **Modern UI/UX**: Clean, responsive design with dark/light theme support
- **Firebase Integration**: Secure authentication and data storage
- **Voice Interaction**: Natural conversation flow with AI interviewer

## ⚙️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **AI Integration**: Vapi AI, Google Gemini
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Voice**: Vapi AI Voice Agents

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- Vapi AI account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-mock-interviews
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_VAPI_WEB_TOKEN=your_vapi_web_token
NEXT_PUBLIC_VAPI_WORKFLOW_ID=your_workflow_id

GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key

NEXT_PUBLIC_BASE_URL=http://localhost:3000

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

1. **Sign Up/Login**: Create an account or sign in with your credentials
2. **Create Interview**: Set up a new mock interview with your preferred role, tech stack, and difficulty level
3. **Take Interview**: Conduct the interview with the AI voice agent
4. **Review Feedback**: Get detailed feedback on your performance across multiple categories
5. **Track Progress**: View your interview history and improvement over time

## 🏗️ Project Structure

```
ai-mock-interviews/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (root)/            # Main application pages
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility functions and actions
├── firebase/              # Firebase configuration
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication and Firestore
3. Generate service account credentials
4. Add your Firebase config to environment variables

### Troubleshooting: Identity Toolkit (accounts:signUp) 400 errors

- If you see a browser console error similar to: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=... 400 (Bad Request)` then:
	1. Verify `NEXT_PUBLIC_FIREBASE_API_KEY` in your `.env.local` is the exact Web API Key shown in Firebase Console -> Project Settings -> General -> Your apps.
	2. Make sure the Email/Password sign-in provider is enabled in Firebase Console -> Authentication -> Sign-in method.
	3. Check for accidental quotes or extra whitespace in `.env.local` values (the API key must not be wrapped in extra quotes).
	4. Inspect the browser console and server logs — the Firebase SDK often prints a descriptive message (e.g., "API key not valid." or "EMAIL_EXISTS").
	5. If the API key is correct and provider is enabled but the error persists, try creating a new API key in the Firebase Console and updating `NEXT_PUBLIC_FIREBASE_API_KEY`.

### Vapi AI Setup
1. Create a Vapi AI account
2. Set up a voice agent workflow
3. Get your web token and workflow ID
4. Add credentials to environment variables

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.
