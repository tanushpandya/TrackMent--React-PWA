import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/auth.service';
import { AppCard } from '../../components/common/AppCard';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'AI & Machine Learning',
  'Biotechnology',
  'Chemical Engineering',
  'Industrial Engineering & Management',
  'Telecommunication Engineering',
  'Computer Science & Design',
  'Cyber Security',
];

export const FacultyProfileScreen: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(
    profile?.fullName ||
      (user?.user_metadata?.full_name as string) ||
      (user?.user_metadata?.name as string) ||
      user?.email?.split('@')[0] ||
      ''
  );
  const [department, setDepartment] = useState(
    profile?.department || 'Computer Science & Engineering'
  );
  const [facultyCode, setFacultyCode] = useState(profile?.facultyCode || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = facultyCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg('Faculty code is required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (profile) {
        await AuthService.saveProfile({
          id: profile.id,
          role: 'MENTOR',
          fullName,
          department,
          facultyCode: cleanCode,
        });
      } else {
        await AuthService.createFacultyProfile({
          fullName,
          department,
          facultyCode: cleanCode,
        });
      }

      await refreshProfile();
      showToast('Faculty profile verified and saved! 🎓', 'success');
      navigate('/mentor/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('verified_faculty') || msg.includes('allow-list')) {
        setErrorMsg('This email is not registered on the verified faculty allow-list.');
      } else {
        setErrorMsg(msg || 'Failed to save faculty profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: '0 16px',
        animation: 'pageIn 0.3s ease both',
      }}
    >
      <AppCard
        title="Faculty Mentor Verification"
        subtitle="Register your academic department and institutional faculty code to access the Faculty Portal."
      >
        {errorMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: '#FBECEB',
              border: '1px solid rgba(179, 79, 92, 0.4)',
              color: '#B34F5C',
              fontSize: 13,
              fontWeight: 650,
              marginBottom: 20,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="faculty-name">
              Full Name (with Title)
            </label>
            <input
              id="faculty-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
              placeholder="e.g. Dr. Neha Kulkarni"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="faculty-dept">
              Academic Department
            </label>
            <select
              id="faculty-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="form-select"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="faculty-code">
              Faculty Code / Employee ID
            </label>
            <input
              id="faculty-code"
              type="text"
              required
              value={facultyCode}
              onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
              className="form-input"
              placeholder="e.g. FAC-CS-01"
            />
            <div className="form-hint">
              Used to match your verified status against the institutional faculty directory.
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              {loading ? 'Verifying...' : 'Complete Verification & Open Portal ↗'}
            </button>
          </div>
        </form>
      </AppCard>
    </div>
  );
};
