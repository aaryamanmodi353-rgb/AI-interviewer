const Interview = require('../models/interview');
const { evaluateAnswerAndAskNext, generateInitialQuestion, generateFinalReport } = require('../services/geminiService');
const pdfParse = require('pdf-parse');

// @desc    Start a new interview session
// @route   POST /api/interviews/start
// @access  Private (Requires Token)
const startInterview = async (req, res) => {
    try {
        const { jobRole, mode = 'technical', difficulty = 'mid-level' } = req.body;

        if (!jobRole) {
            return res.status(400).json({ message: 'Please provide a job role' });
        }

        let cvText = '';
        if (req.file) {
            try {
                const pdfData = await pdfParse(req.file.buffer);
                cvText = pdfData.text;
            } catch (err) {
                console.error("Failed to parse PDF:", err);
                return res.status(400).json({ message: `Failed to extract text from the provided PDF. Details: ${err.message || err}` });
            }
        }

        // Create a blank interview record in the database
        const interview = await Interview.create({
            user: req.user._id, // Got this from the auth middleware!
            jobRole: jobRole,
            mode: mode,
            difficulty: difficulty,
            cvText: cvText,
            transcript: [] // Starts empty
        });

        // Generate the very first intro question
        let firstQuestion = '';
        if (cvText) {
            firstQuestion = await generateInitialQuestion(jobRole, cvText, mode, difficulty);
        } else {
            firstQuestion = `Hello! I will be your interviewer for the ${jobRole} position today. To start, could you please introduce yourself and tell me briefly about your background?`;
        }

        res.status(201).json({
            interviewId: interview._id,
            nextQuestion: firstQuestion
        });

    } catch (error) {
        res.status(500).json({ message: 'Failed to start interview', error: error.message });
    }
};

// @desc    Submit an answer and get AI evaluation/next question
// @route   POST /api/interviews/:id/answer
// @access  Private
const submitAnswer = async (req, res) => {
    try {
        const { question, userAnswer, userCode = '' } = req.body;
        const interviewId = req.params.id;

        // 1. Find the active interview
        const interview = await Interview.findById(interviewId);
        
        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        // 2. Ensure the logged-in user actually owns this interview
        if (interview.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to access this interview' });
        }

        // 3. Send the data to your Gemini Service!
        const aiResponse = await evaluateAnswerAndAskNext(interview.jobRole, question, userAnswer, interview.cvText, interview.mode, interview.difficulty, userCode);

        // 4. Save this specific interaction to the MongoDB transcript array
        interview.transcript.push({
            question: question,
            userAnswer: userAnswer,
            userCode: userCode,
            aiFeedback: aiResponse.feedback,
            score: aiResponse.score
        });

        // 5. Check if the interview should end (Threshold: 2 bad answers or 5 total questions)
        const badAnswersCount = interview.transcript.filter(t => t.score < 5).length;
        const totalQuestions = interview.transcript.length;
        const isOver = badAnswersCount >= 2 || totalQuestions >= 5;

        let finalReport = null;
        if (isOver) {
            interview.status = 'completed';
            finalReport = await generateFinalReport(interview.jobRole, interview.transcript);
            interview.overallScore = finalReport.overallScore;
            interview.generalFeedback = finalReport.generalFeedback;
        }

        await interview.save();

        // 6. Send the AI's response back to React
        res.status(200).json({
            isOver: isOver,
            score: aiResponse.score,
            feedback: aiResponse.feedback,
            nextQuestion: isOver ? null : aiResponse.nextQuestion,
            overallScore: finalReport ? finalReport.overallScore : null,
            generalFeedback: finalReport ? finalReport.generalFeedback : null
        });

    } catch (error) {
        console.error("Submit Answer Error:", error);
        res.status(500).json({ message: `Failed to process answer: ${error.message || error}`, error: error.message });
    }
};

// @desc    Get all past interviews for the logged-in user
// @route   GET /api/interviews
// @access  Private
const getMyInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(interviews);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch interviews', error: error.message });
    }
};

// @desc    Get a single interview by ID
// @route   GET /api/interviews/:id
// @access  Private
const getInterviewById = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }
        if (interview.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        res.status(200).json(interview);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch interview', error: error.message });
    }
};

module.exports = { startInterview, submitAnswer, getMyInterviews, getInterviewById };