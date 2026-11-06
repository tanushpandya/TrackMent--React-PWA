import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, KeyRound, ShieldAlert, CheckCircle, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthService } from '../../services/auth.service';
import { AppCard } from '../../components/common/AppCard';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

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

export const EditProfileScreen: React.FC = () => {
  const { profile, isMentor, refreshProfile, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [usn, setUsn] = useState(profile?.usn || '');
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [section, setSection] = useState(profile?.section || 'A');
  const [semester, setSemester] = useState<number>(profile?.semester || 6);
  const [department, setDepartment] = useState(
    profile?.department || 'Computer Science & Engineering'
  );
  const [facultyCode, setFacultyCode] = useState(profile?.facultyCode || '');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [interestInput, setInterestInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      await AuthService.saveProfile({
        id: profile.id,
        role: profile.role,
        fullName,
        usn: isMentor ? undefined : usn.trim().toUpperCase(),
        branch: isMentor ? undefined : branch,
        section: isMentor ? undefined : section,
        semester: isMentor ? undefined : semester,
        department: isMentor ? department : undefined,
        facultyCode: isMentor ? facultyCode.trim().toUpperCase() : undefined,
        skills: isMentor ? [] : skills,
        interests: isMentor ? [] : interests,
      });

      await refreshProfile();
      showToast('Profile updated successfully! ✨', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await AuthService.updatePassword(newPassword);
      showToast('Password updated successfully! 🔑', 'success');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await AuthService.deleteAccount();
      showToast('Account permanently removed.', 'info');
      navigate('/login');
    } catch (err: any) {
      showToast(err?.message || 'Could not delete account. Team leads must transfer or leave team first.', 'error');
      setShowDeleteModal(false);
    }
  };

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', animation: 'pageIn 0.3s ease both' }}>
      <PageHeader
        eyebrow="Account Settings"
        title="Edit Profile"
        subtitle="Manage your personal information, department details, and authentication settings."
        actions={
          <button
            onClick={() => navigate(-1)}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <AppCard title="Identity Details" subtitle="Email is locked to your verified RVCE Google Account.">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-email">
              Verified Institutional Email
            </label>
            <input
              id="edit-email"
              type="email"
              disabled
              value={profile?.email || ''}
              className="form-input"
              style={{ background: '#F1F6F8', color: '#5E788C', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">
              Full Name
            </label>
            <input
              id="edit-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
            />
          </div>

          {!isMentor ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-usn">
                    USN
                  </label>
                  <input
                    id="edit-usn"
                    type="text"
                    required
                    value={usn}
                    onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-branch">
                    Branch
                  </label>
                  <select
                    id="edit-branch"
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
                  <label className="form-label" htmlFor="edit-semester">
                    Semester
                  </label>
                  <select
                    id="edit-semester"
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
                  <label className="form-label" htmlFor="edit-section">
                    Section
                  </label>
                  <select
                    id="edit-section"
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

              {/* Skills */}
              <div className="form-group">
                <label className="form-label">Skills & Expertise</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={addSkill}
                    placeholder="Add a skill (Press Enter)"
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
                        padding: '4px 10px',
                        borderRadius: 16,
                        background: '#E5F3FA',
                        color: '#0B4D88',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0B4D88' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div className="form-group">
                <label className="form-label">Project Interests</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={addInterest}
                    placeholder="Add an interest (Press Enter)"
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
                        padding: '4px 10px',
                        borderRadius: 16,
                        background: '#EDEBFA',
                        color: '#6D65A5',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeInterest(item)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6D65A5' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-dept">
                  Department
                </label>
                <select
                  id="edit-dept"
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
                <label className="form-label" htmlFor="edit-faccode">
                  Faculty Code
                </label>
                <input
                  id="edit-faccode"
                  type="text"
                  required
                  value={facultyCode}
                  onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                  className="form-input"
                />
              </div>
            </>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '10px 22px' }}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </AppCard>

      {/* Security & Password Card */}
      <AppCard title="Security & Credentials" subtitle="Manage your account password for direct credential login.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48' }}>Account Password</div>
            <div style={{ fontSize: 12, color: '#5E788C', marginTop: 2 }}>
              Set a password to log in directly without requiring Google OAuth every session.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <KeyRound size={15} /> Set / Change Password
          </button>
        </div>
      </AppCard>

      {/* Account Session / Logout */}
      <AppCard
        title="Account Session"
        subtitle="Manage your current active session on this device."
        accent={false}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48' }}>Sign Out of TrackMent</div>
            <div style={{ fontSize: 12, color: '#5E788C', marginTop: 2 }}>
              Securely end your session on this browser. You can log back in at any time.
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              showToast('Logged out successfully.', 'info');
              navigate('/login');
            }}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F1F5F9',
              color: '#334155',
              fontWeight: 700,
              padding: '10px 18px',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </AppCard>

      {/* Danger Zone */}
      <AppCard
        title="Danger Zone"
        subtitle="Irreversible account actions."
        accent={false}
        style={{ border: '1px solid rgba(179, 79, 92, 0.4)', background: '#FFF9F9' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#B34F5C' }}>Delete TrackMent Account</div>
            <div style={{ fontSize: 12, color: '#70899A', marginTop: 2 }}>
              Permanently purges your profile, interests, and non-confirmed records from TrackMent.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={15} /> Delete Account
          </button>
        </div>
      </AppCard>

      {/* Set Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Set / Update Password"
        subtitle="Create a secure password for your TrackMent account."
      >
        <form onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-pw">
              New Password (minimum 6 characters)
            </label>
            <input
              id="new-pw"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-pw">
              Confirm Password
            </label>
            <input
              id="confirm-pw"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={() => setShowPasswordModal(false)} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={passwordLoading} className="btn btn-primary">
              {passwordLoading ? 'Updating...' : 'Save Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Account Deletion"
        subtitle="This action cannot be undone."
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <ShieldAlert size={36} color="#B34F5C" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#102F48', lineHeight: 1.5 }}>
            Are you sure you want to delete your TrackMent profile? All your skills, interests, and
            member records will be permanently removed.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => setShowDeleteModal(false)} className="btn">
            Cancel
          </button>
          <button type="button" onClick={handleDeleteAccount} className="btn btn-danger">
            Delete Permanently
          </button>
        </div>
      </Modal>
    </div>
  );
};
