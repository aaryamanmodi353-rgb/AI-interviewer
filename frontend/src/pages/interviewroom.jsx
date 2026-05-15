import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Send, Award, ArrowLeft, Loader2, Volume2, Bot, User, Sparkles, Cpu, Clock, CameraOff, Download, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import EditorModule from 'react-simple-code-editor';
const Editor = EditorModule.default || EditorModule;
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';
import { submitAnswer, getInterview } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h2>Something went wrong in InterviewRoom.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const InterviewRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentQuestion, setCurrentQuestion] = useState(
    location.state?.initialQuestion || "Hello! I will be your interviewer today. Could you please introduce yourself and tell me briefly about your background?"
  );
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [error, setError] = useState('');
  
  // New states for interview completion
  const [isInterviewOver, setIsInterviewOver] = useState(false);
  const [overallScore, setOverallScore] = useState(null);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Professional feature states
  const [timeLeft, setTimeLeft] = useState(120);
  const [cameraError, setCameraError] = useState(false);
  const [mode, setMode] = useState('technical');
  const [userCode, setUserCode] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const selectedVoiceRef = useRef('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const { data } = await getInterview(id);
        
        if (data.transcript && data.transcript.length > 0) {
          setFeedbackHistory(data.transcript.map(t => ({
            question: t.question,
            answer: t.userAnswer,
            code: t.userCode,
            feedback: t.aiFeedback,
            score: t.score
          })).reverse());
        }

        setMode(data.mode || 'technical');

        if (data.status === 'completed') {
          setIsInterviewOver(true);
          setOverallScore(data.overallScore);
          setGeneralFeedback(data.generalFeedback);
          // Do NOT play audio for completed interviews!
        } else {
          // If it's a new or in-progress interview, play the question once data is loaded
          let startQuestion = location.state?.initialQuestion;
          if (!startQuestion) {
             if (data.transcript && data.transcript.length > 0) {
               startQuestion = "Welcome back. Let's resume your interview. Are you ready for the next question?";
             } else {
               startQuestion = "Hello! I will be your interviewer today. Could you please introduce yourself and tell me briefly about your background?";
             }
          }
          setCurrentQuestion(startQuestion);
          playAudio(startQuestion);
        }
      } catch (err) {
        console.error("Failed to load interview", err);
        setError("Failed to load interview data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInterview();
  }, [id]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false; // Set to false to prevent duplicate/delayed text appending
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => prev ? prev + " " + currentTranscript : currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError("Your browser doesn't support voice recording. Please type your answers.");
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel(); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Professional Feature: Camera Setup
  useEffect(() => {
    if (!isInterviewOver && !isLoading) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera access denied", err);
          setCameraError(true);
        }
      };
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isInterviewOver, isLoading]);

  // Professional Feature: Countdown Timer
  useEffect(() => {
    if (isInterviewOver || isProcessing || isLoading) return;

    if (timeLeft <= 0) {
      // Auto-submit when time is up
      if (userAnswer.trim()) {
        handleSubmit();
      } else {
        // If empty, submit a placeholder instantly
        handleSubmit("I don't know the answer.");
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isInterviewOver, isProcessing, isLoading]);

  // Professional Feature: Voice Selection
  useEffect(() => {
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      // Filter out online/cloud voices because they are notoriously buggy in Edge/Chrome via the API
      const availableVoices = synth.getVoices().filter(v => v.localService === true);
      if (availableVoices.length === 0) return;
      
      const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
      const options = englishVoices.length > 0 ? englishVoices : availableVoices;
      setVoices(options);
      
      // Auto-select a default if none is chosen yet
      setVoices(prevVoices => {
        // the state setter callback avoids dependency warnings
        return options;
      });
      
      setSelectedVoiceName(current => {
        if (!current && options.length > 0) {
          const defaultVoice = options.find(v => v.name.includes('Google US English')) || options[0];
          return defaultVoice.name;
        }
        return current;
      });
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoiceName;
  }, [selectedVoiceName]);

  const playAudio = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel(); 
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (selectedVoiceRef.current) {
        const voice = synth.getVoices().find(v => v.name === selectedVoiceRef.current);
        if (voice) {
          utterance.voice = voice;
        }
      }
      
      utterance.rate = 0.95; 
      utterance.pitch = 1;
      synth.speak(utterance);
    }, 50);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setUserAnswer(''); 
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async (overrideAnswer = null) => {
    const finalAnswer = typeof overrideAnswer === 'string' ? overrideAnswer : userAnswer;
    
    if (!finalAnswer.trim()) return;
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await submitAnswer(id, currentQuestion, finalAnswer, userCode);
      
      setFeedbackHistory(prev => [{
        question: currentQuestion,
        answer: finalAnswer,
        code: userCode,
        feedback: response.data.feedback,
        score: response.data.score
      }, ...prev]);

      setUserAnswer('');
      setUserCode('');

      if (response.data.isOver) {
        setIsInterviewOver(true);
        setOverallScore(response.data.overallScore);
        setGeneralFeedback(response.data.generalFeedback);
        playAudio("This concludes our interview. Thank you for your time. Your final report is ready.");
      } else {
        setCurrentQuestion(response.data.nextQuestion);
        setTimeLeft(120); // Reset timer for next question
        playAudio(response.data.nextQuestion);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateFillerWords = (text) => {
    if (!text) return 0;
    const fillerRegex = /\b(um|uh|like|you know|basically|literally|actually|so)\b/gi;
    const matches = text.match(fillerRegex);
    return matches ? matches.length : 0;
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-indigo-200">
      {/* Glassmorphism Header */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4 max-w-5xl mx-auto w-full">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Live Technical Interview
          </h1>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
            {voices.length > 0 && (
              <select 
                value={selectedVoiceName} 
                onChange={(e) => {
                  setSelectedVoiceName(e.target.value);
                  // Play a tiny sample so the user hears the change immediately
                  const synth = window.speechSynthesis;
                  synth.cancel();
                  setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance("Testing voice");
                    const voice = synth.getVoices().find(v => v.name === e.target.value);
                    if (voice) {
                      utterance.voice = voice;
                    }
                    synth.speak(utterance);
                  }, 50);
                }}
                className="hidden md:block max-w-[200px] truncate text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                title="Change Interviewer Voice"
              >
                {voices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/50 uppercase tracking-widest shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>AI Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-8 mt-4">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p>Loading your interview session...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-200 shadow-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                {error}
              </div>
            )}

            {/* Professional Layout: AI Question Card + Webcam Mirror */}
        {!isInterviewOver && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-start">
            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-3xl shadow-xl relative overflow-hidden group border border-slate-700">
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4 bg-white/10 w-fit px-5 py-2 rounded-full border border-white/10">
                  <div className={`relative flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/50 ${isProcessing ? 'animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]' : ''}`}>
                    <Bot className={`w-5 h-5 text-indigo-200 ${isProcessing ? 'animate-bounce' : ''}`} />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xs font-bold text-indigo-200 uppercase tracking-widest">
                      {isProcessing ? 'Interviewer is thinking...' : 'AI Interviewer'}
                    </h2>
                  </div>
                </div>
                <button 
                  onClick={() => playAudio(currentQuestion)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all backdrop-blur-sm"
                  title="Read Aloud"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              <p className={`text-2xl md:text-3xl font-light text-white leading-relaxed relative z-10 transition-opacity duration-500 ${isProcessing ? 'opacity-50 blur-sm' : 'opacity-100'}`}>
                "{currentQuestion}"
              </p>
            </div>

            {/* Webcam Mirror */}
            <div className="md:col-span-1 bg-slate-900 rounded-3xl shadow-xl overflow-hidden relative border border-slate-700 flex items-center justify-center aspect-video md:aspect-[4/3] w-full">
              {cameraError ? (
                <div className="text-slate-500 flex flex-col items-center gap-2 p-4 text-center">
                  <CameraOff className="w-8 h-8" />
                  <span className="text-xs font-medium">Camera Disabled</span>
                </div>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                />
              )}
              <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                LIVE
              </div>
            </div>
          </div>
        )}

        {/* Elegant Answer Input Section or Completion Screen */}
        {!isInterviewOver ? (
          <div className="bg-white dark:bg-slate-900 p-3 rounded-3xl shadow-lg border border-slate-200/60 dark:border-slate-800 shadow-slate-200/50 dark:shadow-none flex flex-col gap-2">
            
            {/* Timer Progress Bar */}
            <div className="px-3 pt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Time Remaining</span>
                <span className={`text-xs font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all duration-1000 ${timeLeft < 30 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / 120) * 100}%` }}></div>
              </div>
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Click the microphone to speak, or type your verbal answer here..."
              className="w-full h-32 p-5 bg-transparent outline-none resize-none text-slate-700 dark:text-slate-200 leading-relaxed text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={isProcessing}
            />
            
            {mode === 'technical' && (
              <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-2 mb-2 px-3">
                  <Cpu className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Code Editor</span>
                </div>
                <div className="bg-[#f5f2f0] dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <Editor
                    value={userCode}
                    onValueChange={code => setUserCode(code)}
                    highlight={code => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
                    padding={20}
                    placeholder="// Type your code solution here..."
                    style={{
                      fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                      fontSize: 14,
                      minHeight: '120px',
                      color: 'var(--tw-prose-body)'
                    }}
                    className="dark:text-slate-200"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mt-2">
              <button
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'
                } disabled:opacity-50`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-indigo-500" />}
                {isRecording ? 'Listening...' : 'Record Voice'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={isProcessing || !userAnswer.trim()}
                className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                    Analyzing Answer...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Answer
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-200/60 dark:border-slate-800 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
              <Award className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Interview Completed</h2>
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300 font-bold text-lg mb-6">
              Final Score: {overallScore}/10
            </div>
            <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 text-lg leading-relaxed w-full">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Overall Feedback
              </h3>
              <ReactMarkdown>{generalFeedback || 'No feedback available.'}</ReactMarkdown>
            </div>
            <div className="flex gap-4 mt-8 w-full print:hidden">
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-sm"
              >
                Return to Dashboard
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-md flex justify-center items-center gap-2"
              >
                <Download className="w-5 h-5"/> Download PDF Report
              </button>
            </div>
          </div>
        )}

        {/* Stunning Feedback Timeline (BLIND MODE: Only visible at the end) */}
        {isInterviewOver && feedbackHistory.length > 0 && (
          <div className="mt-8 mb-20 animate-fade-in-up print:mt-0 print:mb-0">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">Session Evaluation</h3>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 ml-4"></div>
            </div>

            <div className="space-y-8">
              {feedbackHistory.map((item, index) => (
                <div key={index} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg dark:hover:shadow-slate-800/50 transition-shadow duration-300">
                  
                  {/* AI Question Log */}
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex gap-4 items-start">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Question</p>
                      <p className="text-slate-800 dark:text-slate-200 font-medium text-lg leading-relaxed">{item.question}</p>
                    </div>
                  </div>

                  {/* User Answer Log */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex gap-4 items-start">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-600 dark:text-slate-400 shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="w-full">
                       <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Your Answer</p>
                      <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 italic">"{item.answer}"</p>
                      {item.code && (
                        <div className="mt-4">
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Your Code</p>
                          <div className="bg-[#f5f2f0] dark:bg-[#1e1e1e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                            <pre className="text-sm font-mono m-0 p-0 text-slate-800 dark:text-slate-300"><code>{item.code}</code></pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Feedback Log */}
                  <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 flex flex-col gap-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 dark:bg-indigo-600"></div>
                    
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        AI Feedback
                      </h4>
                      <div className="flex gap-3">
                        {calculateFillerWords(item.answer) > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-bold shadow-sm text-sm">
                            <AlertCircle className="w-4 h-4" /> 
                            {calculateFillerWords(item.answer)} filler words
                          </div>
                        )}
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-extrabold shadow-sm ${
                          item.score >= 8 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400' : 
                          item.score >= 5 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400' : 
                          'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
                        }`}>
                          <Award className="w-5 h-5" /> 
                          Score: {item.score}/10
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-slate-700 dark:text-slate-300 prose prose-indigo dark:prose-invert max-w-none text-lg">
                       <ReactMarkdown>{item.feedback || 'No feedback available.'}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
};

export default InterviewRoom;