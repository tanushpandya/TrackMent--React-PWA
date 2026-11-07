import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, LogIn } from 'lucide-react';
import { FluidMascot } from '../../components/mascot/FluidMascot';
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

  const { status, profile, user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Reactive redirect: automatically navigate as soon as session/profile is resolved
  useEffect(() => {
    if (status === 'ready' && profile) {
      if (profile.role === 'MENTOR') {
        navigate('/mentor/dashboard', { replace: true });
      } else if (profile.role === 'TEAM_LEAD') {
        navigate('/lead/dashboard', { replace: true });
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
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your RVCE email and password.');
      return;
    }

    if (!AuthService.isAllowedEmail(cleanEmail)) {
      setErrorMsg('Please use your official @rvce.edu.in institutional email.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await AuthService.signInWithPassword(cleanEmail, password);
      await refreshProfile();
      showToast('Logged in successfully! ✨', 'success');
      navigate('/', { replace: true });
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background:
          'linear-gradient(180deg, #6FAFD0 0%, #C4E0EB 27%, #F6FBFD 53%, #C8E8EF 78%, #A9CEDE 100%)',
      }}
    >
      {/* Ambient Orbs */}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#FFFFFF',
          borderRadius: 22,
          border: '1px solid #D5E8EF',
          boxShadow: '0 20px 48px rgba(12, 64, 101, 0.18)',
          padding: '32px 28px',
          animation: 'pageIn 0.4s ease both',
          textAlign: 'center',
        }}
      >
        {/* TrackMent Logo */}
        <div style={{ marginBottom: 16 }}>
          <img
            src="/images/trackment_logo.png"
            alt="TrackMent"
            style={{
              width: 64,
              height: 64,
              objectFit: 'contain',
              borderRadius: 16,
              boxShadow: '0 6px 16px rgba(15, 69, 149, 0.2)',
            }}
            onError={(e) => {
              // fallback if image not loaded yet
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Mascot */}
        <div style={{ marginBottom: 14 }}>
          <FluidMascot mood="happy" message="Your next idea starts here!" size={92} />
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
          🎓 RV College of Engineering · Project Portal
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
              <span style={{ fontSize: 16 }}>🌐</span> Sign in with Google (@rvce.edu.in)
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
              <span style={{ fontSize: 16 }}>🌐</span> Sign up with Google (@rvce.edu.in)
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
      </div>
    </div>
  );
};
