import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, BrainCircuit, Cpu, Sparkles } from 'lucide-react';
import { login, register } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- 3D TILT LOGIC ---
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  const handleInteract = (clientX, clientY) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (Max 15 degrees)
    const rotateX = ((y - centerY) / centerY) * -15; 
    const rotateY = ((x - centerX) / centerX) * 15;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseMove = (e) => {
    setIsInteracting(true);
    handleInteract(e.clientX, e.clientY);
  };

  const handleTouchMove = (e) => {
    setIsInteracting(true);
    handleInteract(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleReset = () => {
    setIsInteracting(false);
    setTilt({ x: 0, y: 0 });
  };
  // ----------------------

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isLoginView) {
        response = await login({ email: formData.email, password: formData.password });
      } else {
        response = await register(formData);
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userName', response.data.name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#050505] font-sans selection:bg-indigo-500/30 overflow-hidden relative transition-colors duration-300">
      
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* 3D Floating Background Orbs */}
      <div 
        className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${tilt.y * -2}px, ${tilt.x * -2}px)` }}
      />
      <div 
        className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${tilt.y * 2}px, ${tilt.x * 2}px)` }}
      />

      {/* The 3D Scene Container */}
      <div 
        style={{ perspective: '1200px' }} 
        className="w-full max-w-md p-6 relative z-10"
      >
        {/* The Tilting Card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleReset}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleReset}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: 'preserve-3d',
            transition: isInteracting ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
          }}
          className="relative w-full rounded-3xl bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 shadow-2xl shadow-indigo-500/10 transition-colors duration-300"
        >
          
          {/* Floating Header (Pushed out on Z-axis) */}
          <div 
            style={{ transform: 'translateZ(60px)' }}
            className="flex flex-col items-center mb-8 pointer-events-none"
          >
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 border border-indigo-200 dark:border-white/20">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center drop-shadow-md">
              {isLoginView ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 font-medium mt-2 text-center text-sm">
              {isLoginView ? 'Please sign in to continue.' : 'Sign up to get started.'}
            </p>
          </div>

          {error && (
            <div 
              style={{ transform: 'translateZ(40px)' }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center gap-3 backdrop-blur-sm"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              {error}
            </div>
          )}

          {/* Floating Form (Pushed out on Z-axis) */}
          <form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            style={{ transform: 'translateZ(30px)' }}
          >
            {!isLoginView && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLoginView}
                  className="pl-12 w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3.5 focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  placeholder="Full Name"
                />
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="pl-12 w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3.5 focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                placeholder="Email Address"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="pl-12 w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3.5 focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                placeholder="Password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-indigo-600 dark:bg-white text-white dark:text-black hover:bg-indigo-700 dark:hover:bg-zinc-200 font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/20 dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-70 mt-6"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  {isLoginView ? 'Sign In' : 'Sign Up'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Floating Footer (Pushed out on Z-axis) */}
          <div 
            style={{ transform: 'translateZ(40px)' }}
            className="mt-8 text-center"
          >
            <button
              type="button"
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError('');
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors"
            >
              {isLoginView ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline decoration-indigo-400 underline-offset-4">
                {isLoginView ? "Sign up" : 'Sign in'}
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;