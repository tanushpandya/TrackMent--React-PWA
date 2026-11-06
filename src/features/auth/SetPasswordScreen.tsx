import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/auth.service';
import { AppCard } from '../../components/common/AppCard';

export const SetPasswordScreen: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Include at least one letter and one number');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await AuthService.updatePassword(password);
      showToast('Password saved. You can now log in with email and password.', 'success');
      navigate('/profile/edit');
    } catch (err: any) {
      setError(err?.message || 'Could not save password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <AppCard style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(11, 77, 136, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldCheck size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            Set Account Password
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Choose a password to log in directly with your RVCE email address next time.
          </p>

          <form onSubmit={handleSave} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters with letter & number"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(179, 79, 92, 0.08)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                height: '44px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 3px 0 #07335c',
                marginBottom: '10px',
              }}
            >
              {busy ? <Loader2 size={16} className="spin" /> : 'Save Password'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Cancel
            </button>
          </form>
        </AppCard>
      </div>
    </div>
  );
};
