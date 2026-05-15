const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from the .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors()); // Allows your React frontend to communicate with this backend
app.use(express.json()); // Allows Express to read JSON data sent in requests

// Basic Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'AI Interview Backend is running smoothly! 🚀',
    });
});
// Route Middlewares
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/interviews', require('./routes/interview.routes'));

// Database Connection & Server Initialization
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-interview-db')
    .then(() => {
        console.log('✅ Connected to MongoDB successfully.');
        app.listen(PORT, () => {
            console.log(`✅ Server is listening on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection failed:', error.message);
        // Fallback: Start the server anyway so you can test the /api/health route
        app.listen(PORT, () => {
             console.log(`⚠️ Server is running on http://localhost:${PORT}, but the database is not connected.`);
        });
    });