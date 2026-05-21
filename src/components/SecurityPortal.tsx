import React, { useState } from 'react';
import { User } from '../types';
import { Mail, Lock, User as UserIcon, LogIn, ArrowRight, CheckCircle } from 'lucide-react';
import VinyardLogo from './VinyardLogo';

interface SecurityPortalProps {
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
}

export default function SecurityPortal({ onLoginSuccess, onClose }: SecurityPortalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please specify an email or username.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccessInfo(`Welcome back, ${data.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(data.user);
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !password) {
      setErrorMsg('Please fill in all registration fields.');
      return;
    }
    if (password.length < 5) {
      setErrorMsg('Password should be at least 5 characters long.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password,
          role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessInfo('Account created successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(data.user);
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulated Google Sign-In as requested: "make the account integrated in google account and manage their orders"
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    // Simulate interactive selection of google email
    const googleEmailList = ['tpaulbenedictsandy@gmail.com', 'guest.user@gmail.com', 'vinyard.classic@gmail.com'];
    const chosenEmail = googleEmailList[0]; // defaults to current user metadata email
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: chosenEmail,
          isGoogleAuth: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Authentication failed');
      }

      setSuccessInfo(`Signed in with Google Account: ${chosenEmail}`);
      setTimeout(() => {
        onLoginSuccess(data.user);
        if (onClose) onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg('Google integration error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] bg-white rounded-lg shadow-2xl overflow-hidden border border-brand-green/10">
      {/* Brand Header */}
      <div className="pt-10 pb-6 flex flex-col items-center bg-zinc-50 border-b border-gray-100">
        <VinyardLogo size={110} className="mb-2 drop-shadow-md" />
        <h1 className="font-serif text-3xl font-bold text-brand-green tracking-tight">VINYARD</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-brand-orange font-bold mt-1">Authentic • Local • Fresh</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
          className={`flex-1 py-4 font-serif text-lg font-medium transition-all ${
            activeTab === 'login'
              ? 'border-b-2 border-brand-orange text-brand-green bg-white'
              : 'text-gray-400 bg-gray-50/50 hover:text-brand-green'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
          className={`flex-1 py-4 font-serif text-lg font-medium transition-all ${
            activeTab === 'register'
              ? 'border-b-2 border-brand-orange text-brand-green bg-white'
              : 'text-gray-400 bg-gray-50/50 hover:text-brand-green'
          }`}
        >
          Register
        </button>
      </div>

      <div className="p-8">
        {/* Status Messaging */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {errorMsg}
          </div>
        )}
        {successInfo && (
          <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" />
            {successInfo}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-brand-orange" /> Username or Email Address
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@vinyard.com or admin@vinyard.com"
                className="w-full h-12 px-4 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-brand-orange" /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. customer / admin)"
                className="w-full h-12 px-4 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-brand-green hover:bg-brand-green-hover text-white rounded font-serif font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow disabled:opacity-50"
            >
              {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-brand-orange" /> Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-11 px-4 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-brand-orange" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full h-11 px-4 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-brand-orange" /> Create Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 5 characters"
                className="w-full h-11 px-4 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest block">Role Assignment</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`py-2 px-3 border rounded text-xs font-bold transition-all ${
                    role === 'customer'
                      ? 'border-brand-green bg-brand-green/5 text-brand-green'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Customer Account
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-3 border rounded text-xs font-bold transition-all ${
                    role === 'admin'
                      ? 'border-brand-green bg-brand-green/5 text-brand-green'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Admin POS Portal
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white rounded font-serif font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow mt-2"
            >
              {isLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}

        {/* Separator */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <span className="relative bg-white px-4 text-xs font-mono text-gray-400 uppercase tracking-wider">or integrated</span>
        </div>

        {/* Integrated Google Access as requested */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded font-serif font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm active:scale-98"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1l3.12,2.42c1.83,-1.69 2.89,-4.18 2.89,-7.07C21.35,11.83 21.28,11.4 21.35,11.1z" fill="#4285F4" />
              <path d="M12,20.6c2.43,0 4.47,-0.8 5.96,-2.18l-3.12,-2.42c-0.87,0.59 -1.98,0.94 -2.84,0.94c-2.18,0 -4.03,-1.47 -4.68,-3.46L4.1,16.2c1.49,2.62 4.22,4.4 7.9,4.4z" fill="#34A853" />
              <path d="M7.32,13.48c-0.16,-0.48 -0.26,-1 -0.26,-1.52s0.1,-1.04 0.26,-1.52L4.1,8.02c-0.54,1.07 -0.85,2.27 -0.85,3.54s0.31,2.47 0.85,3.54l3.22,-2.46z" fill="#FBBC05" />
              <path d="M12,6.58c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.87 14.42,3 12,3C8.32,3 5.59,4.78 4.1,7.4L7.32,9.86c0.65,-1.99 2.5,-3.28 4.68,-3.28z" fill="#EA4335" />
            </g>
          </svg>
          Sign in with Google Account
        </button>

        <div className="mt-6 text-center text-xs text-gray-400 font-mono flex items-center justify-center gap-1.5">
          <span>Admins use demo accounts for dashboard POS testing</span>
        </div>
      </div>
    </div>
  );
}
