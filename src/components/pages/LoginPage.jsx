import { useState } from 'react';
import { useAuthStore } from '../../store';

export default function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    setLoading(true); setError('');
    try {
      const result = login(email, password);
      if (!result.ok) setError(result.error || 'Login failed');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = (provider) => {
    // Demo: just log in with placeholder email
    login(`admin@demo.com`, 'sso');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center relative">
          <div className="w-3.5 h-3.5 border-2 border-brand-blue rounded-sm rotate-45 absolute" />
          <div className="w-1.5 h-1.5 bg-brand-green rounded-full absolute" />
        </div>
        <span className="text-xl font-bold text-text-primary">CyberGuard</span>
      </div>
      <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase mb-8">
        Security Intelligence Platform
      </p>

      <div className="w-full max-w-sm bg-bg-secondary border border-border-default rounded-xl p-7 space-y-4">
        <h1 className="text-sm font-semibold text-text-primary">Sign in to your workspace</h1>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1">
            <label className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Work email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@company.com"
              autoComplete="email"
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono placeholder-text-muted focus:outline-none focus:border-brand-blue/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[9px] text-text-muted uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono placeholder-text-muted focus:outline-none focus:border-brand-blue/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-brand-red font-mono bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-blue/15 border border-brand-blue/40 rounded-lg text-sm font-semibold text-brand-blue hover:bg-brand-blue/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="font-mono text-[9px] text-text-muted">or</span>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>

        <div className="space-y-2">
          <button onClick={() => handleSSO('google')} className="w-full flex items-center justify-center gap-2 py-2 bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors font-mono">
            <GoogleIcon /> Google SSO
          </button>
          <button onClick={() => handleSSO('microsoft')} className="w-full flex items-center justify-center gap-2 py-2 bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors font-mono">
            <MicrosoftIcon /> Microsoft SSO
          </button>
        </div>

        <p className="text-center font-mono text-[10px] text-text-muted">
          No account?{' '}
          <button onClick={() => login('trial@newuser.com', 'trial')} className="text-brand-blue hover:underline">
            Start free trial
          </button>
        </p>
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24">
    <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
    <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
    <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
    <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
  </svg>
);
