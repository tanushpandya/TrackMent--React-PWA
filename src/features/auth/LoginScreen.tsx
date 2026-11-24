import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, LogIn } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginScreen: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { status, profile, user, signInWithPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Reactive redirect: automatically navigate as soon as session/profile is resolved
  useEffect(() => {
    if (status === 'ready' && profile) {
      if (profile.role === 'MENTOR') {
        navigate('/mentor/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } else if (status === 'newUser') {
      const detected = AuthService.detectEmailRole(user?.email);
      navigate(detected === 'MENTOR' ? '/profile/faculty' : '/profile/student', { replace: true });
    }
  }, [status, profile, user, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await AuthService.signInWithGoogle();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your RVCE email and password.');
      return;
    }

    if (!AuthService.isAllowedEmail(cleanEmail)) {
      setErrorMsg('Access Restricted: Only official @rvce.edu.in institutional accounts are permitted.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const prof = await signInWithPassword(cleanEmail, password);
      showToast('Logged in successfully.', 'success');
      if (prof?.role === 'MENTOR') {
        navigate('/mentor/dashboard', { replace: true });
      } else if (prof?.role === 'TEAM_LEAD') {
        navigate('/lead/dashboard', { replace: true });
      } else if (prof?.role === 'STUDENT') {
        navigate('/student/dashboard', { replace: true });
      } else {
        const detected = AuthService.detectEmailRole(cleanEmail);
        navigate(detected === 'MENTOR' ? '/profile/faculty' : '/profile/student', { replace: true });
      }
    } catch (e: any) {
      const msg = e?.message?.toLowerCase() || '';
      if (msg.includes('invalid login credentials')) {
        setErrorMsg(
          'Invalid email or password. If you have not set a password yet, please sign in with Google first.'
        );
      } else {
        setErrorMsg(e?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="surface-card w-full max-w-[440px] p-7 sm:p-8 text-center animate-in fade-in duration-200">
        {/* TrackMent Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/images/trackment_logo.png"
            alt="TrackMent"
            className="w-[72px] h-[72px] object-contain rounded-2xl shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Title & Tagline */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#102F48',
            letterSpacing: '-0.8px',
            margin: '0 0 6px 0',
          }}
        >
          TrackMent
        </h1>

        <p
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: '#5E788C',
            margin: '0 0 10px 0',
          }}
        >
          Evidence-Based Project Governance
        </p>

        {/* Institutional Badge */}
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 20,
            background: '#E5F3FA',
            border: '1px solid rgba(11, 77, 136, 0.2)',
            fontSize: 11.5,
            fontWeight: 700,
            color: '#0B4D88',
            marginBottom: 24,
          }}
        >
          RV College of Engineering · Project Portal
        </div>

        {/* Mode Toggle: Log In / Sign Up */}
        <div
          style={{
            display: 'flex',
            padding: 4,
            background: '#DCECEF',
            borderRadius: 12,
            border: '1px solid #D5E8EF',
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(true);
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 9,
              background: isLoginMode ? '#FFFFFF' : 'transparent',
              color: isLoginMode ? '#0B4D88' : '#5E788C',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: isLoginMode ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(false);
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 9,
              background: !isLoginMode ? '#FFFFFF' : 'transparent',
              color: !isLoginMode ? '#0B4D88' : '#5E788C',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: !isLoginMode ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            Sign up
          </button>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#FBECEB',
              border: '1px solid rgba(179, 79, 92, 0.4)',
              color: '#B34F5C',
              fontSize: 12.5,
              fontWeight: 650,
              textAlign: 'left',
              marginBottom: 20,
              animation: 'pageIn 0.2s ease both',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Primary Action Button */}
        {isLoginMode ? (
          <div>
            <form onSubmit={handlePasswordLogin} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="email-input">
                  Institutional Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="email-input"
                    type="email"
                    required
                    placeholder="your.name@rvce.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <Mail
                    size={16}
                    style={{ position: 'absolute', left: 12, top: 13, color: '#7992A1' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password-input">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38, paddingRight: 38 }}
                  />
                  <Lock
                    size={16}
                    style={{ position: 'absolute', left: 12, top: 13, color: '#7992A1' }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 13,
                      background: 'none',
                      border: 'none',
                      color: '#7992A1',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 16px', fontSize: 14, marginTop: 6 }}
              >
                {loading ? 'Signing in...' : 'Sign In with Password'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '20px 0',
                color: '#7992A1',
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#D5E8EF' }} />
              <span style={{ padding: '0 12px', fontWeight: 700 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#D5E8EF' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 13.5,
                background: '#FFFFFF',
              }}
            >
              Sign in with Google (@rvce.edu.in)
            </button>
          </div>
        ) : (
          <div>
            <p
              style={{
                fontSize: 13,
                color: '#5E788C',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              First-time users must register with their official <strong>@rvce.edu.in</strong> Google
              account. Once authenticated, your workspace role is assigned automatically.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: 14,
              }}
            >
              Sign up with Google (@rvce.edu.in)
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: 26,
            fontSize: 11,
            color: '#7992A1',
            lineHeight: 1.4,
          }}
        >
          Protected by RVCE Single Sign-On and Database Row-Level Security.
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Link
            to="/manual"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0B4D88',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Read User Manual &amp; Grading Rubrics
          </Link>
        </div>
      </div>
    </div>
  );
};
