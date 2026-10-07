import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Building2, ShieldCheck, Check, AlertCircle, ArrowLeft } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time Password Policy Checklist (Section 6.2)
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPolicySatisfied = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPolicySatisfied) {
      setError('Password does not fulfill complexity requirements.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(name, email, password, 'SalesExecutive');
      if (!result.success) {
        setError(result.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-white tracking-tight">
          Create AcxiomCRM Account
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enforcing Section 6.2 Password Security & Complexity Standards
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-8 border border-slate-100 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. John Miller"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jmiller@acxiomcrm.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Password Policy Checklist Box (Section 6.2) */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                Password Security Requirements:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className={`flex items-center gap-1 ${hasMinLen ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3 h-3 ${hasMinLen ? 'text-emerald-600' : 'text-slate-300'}`} />
                  Min 8 Characters
                </span>
                <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3 h-3 ${hasUpper ? 'text-emerald-600' : 'text-slate-300'}`} />
                  1 Uppercase Letter
                </span>
                <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3 h-3 ${hasLower ? 'text-emerald-600' : 'text-slate-300'}`} />
                  1 Lowercase Letter
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                  1 Numeric Digit
                </span>
                <span className={`flex items-center gap-1 col-span-2 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className={`w-3 h-3 ${hasSpecial ? 'text-emerald-600' : 'text-slate-300'}`} />
                  1 Special Character (!@#$%^&*)
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPolicySatisfied}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
            >
              {loading ? 'Registering...' : 'Register & Enter CRM'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <button
              onClick={onSwitchToLogin}
              className="text-xs text-slate-600 hover:text-blue-600 font-semibold flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
