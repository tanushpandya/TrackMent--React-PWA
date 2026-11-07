import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/auth.service';
import { AppCard } from '../../components/common/AppCard';

const BRANCHES = [
  'CSE',
  'ISE',
  'ECE',
  'EEE',
  'ME',
  'CV',
  'AIML',
  'BT',
  'CHEM',
  'IEM',
  'ETE',
  'CD',
  'CY',
];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const USN_PATTERN = /^(1R[VZ]|RVCE)\d{2}[A-Z]{2,4}\d{3}$/;

export const StudentProfileScreen: React.FC = () => {
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
  const [usn, setUsn] = useState(profile?.usn || '');
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [section, setSection] = useState(profile?.section || 'A');
  const [semester, setSemester] = useState<number>(profile?.semester || 6);
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [interestInput, setInterestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setSkillInput('');
    }
  };

  const removeSkill = (tag: string) => {
    setSkills(skills.filter((s) => s !== tag));
  };

  const addInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = interestInput.trim();
    if (clean && !interests.includes(clean)) {
      setInterests([...interests, clean]);
      setInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((i) => i !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsn = usn.trim().toUpperCase();

    if (!cleanUsn) {
      setErrorMsg('USN is required.');
      return;
    }

    if (!USN_PATTERN.test(cleanUsn)) {
      setErrorMsg(
        'Invalid USN format. Must follow standard VTU/RVCE format (e.g. 1RV22CS045 or RVCE22CS045).'
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (profile) {
        await AuthService.saveProfile({
          id: profile.id,
          fullName,
          usn: cleanUsn,
          branch,
          section,
          semester,
          skills,
          interests,
        });
      } else {
        await AuthService.createStudentProfile({
          fullName,
          usn: cleanUsn,
          branch,
          section,
          semester,
          skills,
          interests,
        });
      }

      await refreshProfile();
      showToast('Profile saved successfully! ✨', 'success');
      navigate('/team-formation/before-team');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save student profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 680,
        margin: '40px auto',
        padding: '0 16px',
        animation: 'pageIn 0.3s ease both',
      }}
    >
      <AppCard
        title="Student Profile Onboarding"
        subtitle="Complete your academic details to get matched with project teams and faculty mentors."
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
            <label className="form-label" htmlFor="full-name">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
              placeholder="e.g. Alex Morgan"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="usn">
                USN (University Seat Number)
              </label>
              <input
                id="usn"
                type="text"
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value.toUpperCase())}
                className="form-input"
                placeholder="1RV22CS045"
              />
              <div className="form-hint">Accepted: 1RV22CS045 or RVCE22CS045</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="branch">
                Branch / Department
              </label>
              <select
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="form-select"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="semester">
                Semester
              </label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="form-select"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="section">
                Section
              </label>
              <select
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="form-select"
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skills Tag Input */}
          <div className="form-group">
            <label className="form-label">Skills & Technical Competencies</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                placeholder="e.g. React, Flutter, Python, Figma (Press Enter)"
                className="form-input"
              />
              <button type="button" onClick={addSkill} className="btn btn-sm">
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map((s) => (
                <span
                  key={s}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 16,
                    background: '#E5F3FA',
                    color: '#0B4D88',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0B4D88',
                      cursor: 'pointer',
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Interests Tag Input */}
          <div className="form-group">
            <label className="form-label">Research & Project Interests</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={addInterest}
                placeholder="e.g. Distributed Systems, HealthTech, IoT (Press Enter)"
                className="form-input"
              />
              <button type="button" onClick={addInterest} className="btn btn-sm">
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {interests.map((item) => (
                <span
                  key={item}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 16,
                    background: '#EDEBFA',
                    color: '#6D65A5',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeInterest(item)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6D65A5',
                      cursor: 'pointer',
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              {loading ? 'Saving Profile...' : 'Save & Continue to Workspace ↗'}
            </button>
          </div>
        </form>
      </AppCard>
    </div>
  );
};
