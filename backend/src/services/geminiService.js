const { GoogleGenAI } = require('@google/genai');

// Initialize the Gemini client using the API key from your .env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Sends the user's answer to Gemini and gets the evaluation and next question.
 * @param {String} jobRole - e.g., "Frontend Developer"
 * @param {String} question - The question that was just asked
 * @param {String} userAnswer - The user's transcribed audio/text answer
 * @param {String} [cvText] - Optional. The extracted text from the user's CV
 * @returns {Object} - JSON object containing score, feedback, and nextQuestion
 */
const evaluateAnswerAndAskNext = async (jobRole, question, userAnswer, cvText = '', mode = 'technical', difficulty = 'mid-level', userCode = '') => {
    try {
        const persona = mode === 'behavioral' 
            ? `an HR Manager conducting a behavioral and culture-fit interview` 
            : `a strict, professional Senior Technical Interviewer conducting a technical interview`;

        const systemPrompt = `
            You are ${persona} for a ${difficulty}-level ${jobRole} position. Please scale your questions to match this difficulty level.
            ${cvText ? `\nThe candidate's CV is as follows:\n"""\n${cvText}\n"""\nMake sure to occasionally tailor your questions to their specific experience and background mentioned in their CV.\n` : ''}
            The candidate was asked this question: "${question}"
            The candidate provided this spoken answer: "${userAnswer}"
            ${userCode ? `\nThe candidate also provided this code snippet:\n"""\n${userCode}\n"""\nPlease evaluate both their spoken explanation and their code quality.` : ''}

            Your task:
            1. Evaluate the answer for technical accuracy, clarity, and completeness.
            2. Give a score out of 10 (this will be hidden from the user until the end).
            3. Provide 1-2 sentences of constructive feedback (also hidden until the end).
            4. Formulate the next response. Start by briefly and naturally acknowledging their answer (e.g., "That makes sense.", "Good point about X.", or "I see."), and then ask the next logical interview question for a ${jobRole}. It should get slightly harder if they answered well.

            IMPORTANT: You must respond ONLY with a raw JSON object. Do not include markdown formatting like \`\`\`json. 
            Use this exact structure:
            {
                "score": 8,
                "feedback": "Your internal feedback here...",
                "nextQuestion": "That's a good explanation. Now, can you tell me how you would..."
            }
        `;

        let response;
        let retries = 3;
        while (retries > 0) {
            try {
                // We use gemini-2.5-flash as it is the fastest and best for real-time back-and-forth chat
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: systemPrompt,
                    config: {
                        // Forcing JSON output makes it infinitely easier for our React app to use
                        responseMimeType: "application/json", 
                    }
                });
                break; // Success, exit retry loop
            } catch (apiError) {
                if (apiError.status === 503 && retries > 1) {
                    console.warn(`Gemini API 503 error, retrying... (${retries - 1} attempts left)`);
                    retries--;
                    await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds before retry
                } else if (apiError.status === 429) {
                    throw new Error("Google Gemini API rate limit exceeded (Too many requests). Please wait about a minute and try again.");
                } else {
                    throw apiError; // Throw other errors or if out of retries
                }
            }
        }

        // Safely parse the text response into a usable JavaScript object
        let rawText = response.text;
        // Strip markdown formatting if Gemini included it despite responseMimeType
        if (rawText.startsWith('\`\`\`json')) {
            rawText = rawText.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
        } else if (rawText.startsWith('\`\`\`')) {
            rawText = rawText.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
        }
        
        const aiResult = JSON.parse(rawText);
        return aiResult;

    } catch (error) {
        console.error("Error communicating with Gemini API:", error);
        throw new Error(error.message || "Failed to generate AI response");
    }
};

/**
 * Asks Gemini to generate a personalized initial question based on the user's CV.
 * @param {String} jobRole 
 * @param {String} cvText 
 * @returns {String} The generated question
 */
const generateInitialQuestion = async (jobRole, cvText, mode = 'technical', difficulty = 'mid-level') => {
    try {
        const persona = mode === 'behavioral' 
            ? `an HR Manager conducting a behavioral and culture-fit interview` 
            : `a strict, professional Senior Technical Interviewer conducting a technical interview`;

        const prompt = `
            You are ${persona} for a ${difficulty}-level ${jobRole} position. Please scale your expectations and questions to match this difficulty level.
            The candidate has provided their CV.
            
            CV Content:
            """
            ${cvText}
            """
            
            Your task: Generate ONE single introductory interview question based on their CV and the ${jobRole} role. 
            It should be a polite but professional opening question asking them to introduce themselves and elaborating on a specific interesting point from their CV.
            
            IMPORTANT: Respond with ONLY the question text. Do not include quotes or any other formatting.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating initial question:", error);
        return `Hello! I will be your interviewer for the ${jobRole} position today. To start, could you please introduce yourself and tell me briefly about your background?`;
    }
};

/**
 * Asks Gemini to generate a final performance report based on the interview transcript.
 * @param {String} jobRole 
 * @param {Array} transcript 
 * @returns {Object} { overallScore, generalFeedback }
 */
const generateFinalReport = async (jobRole, transcript, mode = 'technical', difficulty = 'mid-level') => {
    try {
        const persona = mode === 'behavioral' 
            ? `an HR Manager concluding a behavioral and culture-fit interview` 
            : `a Senior Technical Interviewer concluding a technical interview`;

        const transcriptText = transcript.map((t, i) => 
            `Q${i+1}: ${t.question}\nA${i+1}: ${t.userAnswer}\n${t.userCode ? `Code: ${t.userCode}\n` : ''}Score: ${t.score}/10\nFeedback: ${t.aiFeedback}`
        ).join('\n\n');

        const prompt = `
            You are ${persona} for a ${difficulty}-level ${jobRole} position.
            
            Here is the complete transcript of the interview:
            """
            ${transcriptText}
            """
            
            Your task:
            1. Evaluate the candidate's overall performance.
            2. Provide a final overall score out of 10.
            3. Write a comprehensive paragraph of general feedback. Address their flaws, highlight their strengths, and give them constructive advice for future interviews.
            
            IMPORTANT: You must respond ONLY with a raw JSON object. Do not include markdown formatting like \`\`\`json.
            Use this exact structure:
            {
                "overallScore": 7,
                "generalFeedback": "Your final feedback here..."
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json", 
            }
        });

        let rawText = response.text;
        if (rawText.startsWith('\`\`\`json')) {
            rawText = rawText.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
        } else if (rawText.startsWith('\`\`\`')) {
            rawText = rawText.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
        }

        const aiResult = JSON.parse(rawText);
        return {
            overallScore: aiResult.overallScore,
            generalFeedback: aiResult.generalFeedback
        };
    } catch (error) {
        console.error("Error generating final report:", error);
        return {
            overallScore: 0,
            generalFeedback: "We were unable to generate a final report due to an AI service error."
        };
    }
};

module.exports = {
    evaluateAnswerAndAskNext,
    generateInitialQuestion,
    generateFinalReport
};