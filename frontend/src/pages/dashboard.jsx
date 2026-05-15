import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Play, Clock, LogOut, User, TrendingUp, Target, Sparkles, Bot, History } from 'lucide-react';
import { getMyInterviews, startInterview } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [jobRole, setJobRole] = useState('');
  const [mode, setMode] = useState('technical');
  const [difficulty, setDifficulty] = useState('mid-level');
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const userName = localStorage.getItem('userName') || 'User';

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const { data } = await getMyInterviews();
        setInterviews(data);
      } catch (err) {
        console.error("Failed to fetch interviews");
        if (err.response?.status === 401) handleLogout();
      } finally {
        setFetching(false);
      }
    };
    fetchInterviews();
  }, []);

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!jobRole.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('jobRole', jobRole);
      formData.append('mode', mode);
      formData.append('difficulty', difficulty);
      if (cvFile) formData.append('cv', cvFile);

      const { data } = await startInterview(formData);
      navigate(`/interview/${data.interviewId}`, { state: { initialQuestion: data.nextQuestion } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start interview.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/');
  };

  const chartData = interviews
    .filter(i => i.status === 'completed' && i.overallScore !== null)
    .map((i, index) => ({
      date: new Date(i.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: i.overallScore
    })).slice(-10);

  const averageScore = chartData.length > 0 
    ? (chartData.reduce((acc, curr) => acc + curr.score, 0) / chartData.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-200">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              AI Interview Pro
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
              <User className="w-5 h-5" />
              <span className="font-medium text-sm">{userName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-5xl">
            Welcome back.
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Ready to ace your next technical interview? Configure your session below and practice with real-time AI feedback.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-200 dark:border-slate-800 p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50"></div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <Sparkles className="w-5 h-5 text-indigo-500 mr-2" />
            New Interview Session
          </h3>
          
          <form onSubmit={handleStartInterview} className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Job Role <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Senior Frontend Developer"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              >
                <option value="intern">Intern</option>
                <option value="junior">Junior</option>
                <option value="mid-level">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="principal">Principal</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Resume Context (Optional)</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCvFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-between group-hover:border-indigo-400 transition-colors">
                  <span className="truncate">{cvFile ? cvFile.name : 'Upload CV (PDF, optional)'}</span>
                  <Briefcase className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !jobRole.trim()}
              className="md:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {loading ? (
                <span>Starting...</span>
              ) : (
                <>
                  <span>Start</span>
                  <Play className="w-4 h-4 fill-current" />
                </>
              )}
            </button>
          </form>
          {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        </div>

        {!fetching && chartData.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 mb-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 text-indigo-500 mr-2" />
                Performance Analytics
              </h3>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-bold border border-indigo-100 dark:border-indigo-800/50">
                Avg Score: {averageScore}/10
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <ReferenceLine y={averageScore} stroke="#6366f1" strokeDasharray="3 3" opacity={0.5} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#6366f1' }}
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <History className="w-5 h-5 text-slate-400 mr-2" />
            Interview History
          </h3>
          
          {fetching ? (
            <p className="text-slate-500 dark:text-slate-400">Loading your history...</p>
          ) : interviews.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              <p className="text-slate-500 dark:text-slate-400">You haven't completed any interviews yet. Start one above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.map((interview) => (
                <div key={interview._id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md dark:hover:shadow-slate-800/50 transition-shadow">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                    {new Date(interview.createdAt).toLocaleDateString()}
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white mt-2 line-clamp-1">{interview.jobRole}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {interview.transcript.length} questions answered
                  </p>
                  <button 
                    onClick={() => navigate(`/interview/${interview._id}`)}
                    className={`mt-4 text-sm font-medium ${interview.status === 'completed' ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300' : 'text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300'}`}
                  >
                    {interview.status === 'completed' ? 'View Feedback →' : 'Resume Interview →'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;