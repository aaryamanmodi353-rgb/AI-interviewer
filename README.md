# AI Interviewer Platform

A full-stack application designed to conduct dynamic, role-specific mock interviews. By leveraging the Google Gemini API and native browser voice APIs, this platform simulates real-time interview environments, evaluates user responses, and provides immediate, actionable feedback.

## Tech Stack
* **Frontend:** React.js, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **AI Integration:** Google Gemini API
* **Deployment:** Vercel

---

## Getting Started

### 1. Clone the repository
```bash
git clone [https://github.com/aaryamanmodi353-rgb/AI-interviewer.git](https://github.com/aaryamanmodi353-rgb/AI-interviewer.git)
cd AI-interviewer

```

### 2. Environment Variables

Create a `.env` file in your root directory. You will need a Gemini API key and a MongoDB connection string.

```env
# Server Configuration
PORT=5000

# Database
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-interviewer?retryWrites=true&w=majority"

# External APIs
GEMINI_API_KEY="your_google_gemini_api_key"

```

### 3. Installation & Running Locally

Install the dependencies for both the frontend and backend (assuming a concurrent setup or separate directories).

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

```

Navigate to `http://localhost:3000` to interact with the UI, select an interview role, and begin a mock session.

---

## Architecture & Core Mechanics

### 1. AI Evaluation Loop & Prompt Engineering

The core of the application relies on structured interactions with the Google Gemini API. Instead of open-ended conversational text, the backend enforces structured JSON responses from the LLM.

* When a user submits an answer (either via text or voice transcription), the Express backend constructs a contextual prompt containing the job role, the specific question asked, and the user's raw answer.
* The system instructs Gemini to evaluate the answer against industry standards and return a strict JSON object containing a `score` (1-10) and `constructive_feedback`.
* This ensures the React frontend can reliably parse the data and update the UI without risking formatting breaks from the AI.

### 2. Voice Integration (Native APIs)

To create a seamless, hands-free experience that mimics a real interview, the frontend utilizes native browser Web Speech APIs (Speech Recognition).

* The user's spoken audio is transcribed locally in the browser, reducing server payload and eliminating the need for a third-party transcription service.
* Once the user stops speaking, the finalized transcript is dispatched to the backend for the AI evaluation loop.

### 3. State Management & Transcript Storage

All interview sessions are securely tracked. MongoDB is used to store user profiles and comprehensive interview transcripts. This allows users to revisit past sessions, track their performance metrics over time, and review specific feedback to improve their answers iteratively.

---

## Trade-Offs & Future Improvements

If I were to expand this platform for enterprise or larger-scale consumer use, I would implement the following architectural changes:

1. **WebSockets for Lower Latency:** Currently, the evaluation loop relies on standard HTTP requests. Connecting to the Gemini API introduces inherent latency. Transitioning to WebSockets (e.g., Socket.io) would allow for streaming AI responses, dramatically reducing the perceived wait time for the user and making the interview feel more conversational.
2. **Advanced Audio Processing:** Relying on the browser's native Speech Recognition API is efficient but can struggle with heavy accents or background noise depending on the user's device. For a production-grade application, I would integrate a dedicated Whisper AI model pipeline for higher accuracy transcription.
3. **Caching with Redis:** To reduce API costs and improve speed, I would implement a caching layer. If multiple users apply for standard roles (e.g., "Junior React Developer") and ask the system to generate standard behavioral questions, Redis could serve previously generated, high-quality question sets instantly without hitting the Gemini API every time.

```

```
