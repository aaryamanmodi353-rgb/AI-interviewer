const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Links this interview to a specific user
        required: true
    },
    jobRole: {
        type: String,
        required: true, // e.g., "Frontend Developer", "Data Scientist"
    },
    mode: {
        type: String,
        enum: ['technical', 'behavioral'],
        default: 'technical'
    },
    difficulty: {
        type: String,
        enum: ['intern', 'junior', 'mid-level', 'senior', 'principal'],
        default: 'mid-level'
    },
    cvText: {
        type: String,
        default: ''
    },
    transcript: [{
        question: { type: String, required: true },
        userAnswer: { type: String, required: true },
        userCode: { type: String, default: '' },
        aiFeedback: { type: String }, // Specific feedback for this single answer
        score: { type: Number }       // Score out of 10 for this specific answer
    }],
    overallScore: {
        type: Number,
        default: null
    },
    generalFeedback: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['in-progress', 'completed'],
        default: 'in-progress'
    }
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);