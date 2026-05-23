# AI Interviewer Platform

An independently developed, end-to-end full-stack application designed to conduct dynamic, role-specific mock interviews. This platform leverages ReactJS for a responsive frontend and NodeJS/Express for robust backend processing, simulating real-time interview environments with immediate, actionable feedback.

**Live Demo:** https://ai-interviewer-zeta-six.vercel.app/

## 🛠 Tech Stack (MERN)
This project was built from scratch to demonstrate proficiency in modern web frameworks and full-stack architecture:
* **Frontend:** ReactJS, Tailwind CSS (Native Web Speech API for audio)
* **Backend:** NodeJS, Express.js
* **Database:** MongoDB
* **External APIs:** Google Gemini API (for natural language evaluation)

---

## 🧠 Core Architecture & Engineering Decisions

*Note: The core logic, state management, and API integrations in this repository were written completely independently, demonstrating original problem-solving without reliance on copied code from online platforms.*

### 1. Custom Evaluation Loop (NodeJS/Express)
Instead of relying on pre-built conversational widgets, I engineered a custom backend pipeline to handle AI interactions predictably. 
* The Express backend receives the user's transcript and constructs a strict contextual prompt containing the job role and the exact question.
* It enforces a structured JSON response from the LLM, returning a quantifiable `score` and `constructive_feedback`. 
* This prevents formatting breaks on the frontend and allows for reliable data storage in MongoDB.

### 2. Native Voice Integration (ReactJS)
To minimize server payload and eliminate third-party transcription costs, I integrated the browser's native `SpeechRecognition` API directly into the React lifecycle.
* Audio state is managed locally within React components.
* Once the user stops speaking, the finalized transcript is automatically dispatched to the Express backend for the AI evaluation loop, creating a seamless, hands-free user experience.

### 3. Persistent State & Transcript Storage (MongoDB)
All user sessions, including role selections, questions asked, and AI feedback, are stored securely in MongoDB. This allows users to track their performance metrics over time and review specific feedback to iterate on their interview skills.

---

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
```bash
git clone [https://github.com/aaryamanmodi353-rgb/AI-interviewer.git](https://github.com/aaryamanmodi353-rgb/AI-interviewer.git)
cd AI-interviewer

```

### 2. Environment Variables

Create a `.env` file in your root directory with the following keys:

```env
# Server Configuration
PORT=5000

# Database
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-interviewer?retryWrites=true&w=majority"

# External APIs
GEMINI_API_KEY="your_google_gemini_api_key"

```

### 3. Installation & Execution

Install the dependencies for both the frontend and backend environments.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

```

Navigate to `http://localhost:3000` to interact with the UI.

---

## 📈 Future Scalability Enhancements

While this application serves as a robust proof-of-concept for full-stack integration, future iterations for enterprise scaling would include:

1. **WebSocket Integration:** Migrating from standard HTTP polling to WebSockets (Socket.io) to stream AI responses byte-by-byte, dramatically reducing perceived latency.
2. **Caching Layer:** Implementing Redis to cache standard behavioral questions for common roles (e.g., "Junior React Developer"), reducing external API calls and improving load times.

```

***

### Why this works for Afford Medical:
1. **Hits the Keywords:** It prominently features **ReactJS** and **NodeJS** right at the top.
2. **Addresses the "Plagiarism" Rule:** The note under *Core Architecture* subtly but firmly states that the code is original and independently engineered.
3. **Shows Engineering Maturity:** The "Future Scalability Enhancements" section shows you understand how to take a project from a student portfolio piece to an enterprise-grade application (mentioning WebSockets and Redis).

```
