import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  UserPlus,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Building,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { ProfileModel, TeamInvitationModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';

const BRANCH_OPTIONS = ['All Branches', 'CSE', 'ISE', 'AIML', 'ECE', 'EEE', 'ME', 'CV'];
const SEMESTER_OPTIONS = ['All', '5', '6', '7', '8'];

export const BrowseStudentsScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isRecruitingMode = searchParams.get('isRecruitingMode') === 'true';

  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<ProfileModel[]>([]);
  const [sentInvites, setSentInvites] = useState<TeamInvitationModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedSemester, setSelectedSemester] = useState('All');

  // Selected students in creation mode
  const [selectedInCreation, setSelectedInCreation] = useState<ProfileModel[]>([]);

  // Inspect profile modal
  const [previewStudent, setPreviewStudent] = useState<ProfileModel | null>(null);

  // Invite loading
  const [actingStudentId, setActingStudentId] = useState<string | null>(null);

  // Load initial selected students from session storage if in creation mode
  useEffect(() => {
    if (!isRecruitingMode) {
      try {
        const stored = sessionStorage.getItem('trackment_selected_invitees');
        if (stored) {
          setSelectedInCreation(JSON.parse(stored));
        }
      } catch (_) {}
    }
  }, [isRecruitingMode]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const branchParam = selectedBranch === 'All Branches' ? '' : selectedBranch;
      const [list, invites] = await Promise.all([
        TeamService.searchAvailableStudents(query, branchParam),
        isRecruitingMode && team
          ? TeamService.fetchTeamSentInvitations(team.id)
          : Promise.resolve([]),
      ]);
      setStudents(list);
      setSentInvites(invites.filter((i) => i.status === 'PENDING'));
    } catch (e) {
      console.error('Failed to load students:', e);
      showToast('Could not load student directory', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, selectedBranch, isRecruitingMode, team, showToast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleToggleCreationSelect = (student: ProfileModel) => {
    const isSelected = selectedInCreation.some((s) => s.id === student.id);
    let updated: ProfileModel[];
    if (isSelected) {
      updated = selectedInCreation.filter((s) => s.id !== student.id);
    } else {
      updated = [...selectedInCreation, student];
    }
    setSelectedInCreation(updated);
    try {
      sessionStorage.setItem('trackment_selected_invitees', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleSendInvite = async (student: ProfileModel) => {
    if (!team) return;
    setActingStudentId(student.id);
    try {
      await TeamService.sendInvitation(team.id, student.id);
      showToast(`Invitation sent to ${student.fullName}!`, 'success');
      await loadStudents();
    } catch (e: any) {
      showToast(e?.message || 'Could not send invite.', 'error');
    } finally {
      setActingStudentId(null);
    }
  };

  const handleCancelInvite = async (studentId: string, studentName?: string) => {
    if (!team) return;
    setActingStudentId(studentId);
    try {
      await TeamService.cancelInvitation(team.id, studentId);
      showToast(`Cancelled invitation to ${studentName || 'student'}.`, 'info');
      await loadStudents();
    } catch (e: any) {
      showToast(e?.message || 'Could not cancel invite.', 'error');
    } finally {
      setActingStudentId(null);
    }
  };

  const handleDoneSelection = () => {
    try {
      sessionStorage.setItem('trackment_selected_invitees', JSON.stringify(selectedInCreation));
    } catch (_) {}
    navigate('/team-formation/create-team');
  };

  const filteredStudents = students.filter((s) => {
    if (selectedSemester !== 'All' && s.semester?.toString() !== selectedSemester) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={() => navigate(isRecruitingMode ? '/lead/join-requests' : '/team-formation/create-team')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'white',
            border: '1px solid var(--color-border)',
            padding: '8px 16px',
            borderRadius: '9999px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <ArrowLeft size={16} />
          {isRecruitingMode ? 'Back to Join Requests' : 'Back to Team Creation'}
        </button>

        {!isRecruitingMode && (
          <button
            onClick={handleDoneSelection}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 0 #07335c',
            }}
          >
            <Check size={16} />
            Done ({selectedInCreation.length} Selected)
          </button>
        )}
      </div>

      {/* Page Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
          {isRecruitingMode ? 'Recruit Team Members' : 'Select Members for Your Team'}
        </h1>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
          {isRecruitingMode
            ? `Search and invite candidates to join "${team?.teamName || 'your team'}".`
            : 'Select peers you wish to invite to your new project team.'}
        </p>
      </div>

      {/* Search & Filter Header */}
      <AppCard style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search
            size={16}
            color="var(--color-text-secondary)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student name, USN, or skills..."
            style={{
              width: '100%',
              padding: '10px 36px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13.5px',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Branch Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {BRANCH_OPTIONS.map((br) => {
            const isSelected = selectedBranch === br;
            return (
              <button
                key={br}
                onClick={() => setSelectedBranch(br)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                  background: isSelected ? 'rgba(11, 77, 136, 0.12)' : 'white',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {br}
              </button>
            );
          })}
        </div>

        {/* Semester Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Semester:</span>
          {SEMESTER_OPTIONS.map((sem) => {
            const isSelected = selectedSemester === sem;
            return (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                  background: isSelected ? 'rgba(11, 77, 136, 0.12)' : 'white',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {sem === 'All' ? 'All Sems' : `Sem ${sem}`}
              </button>
            );
          })}
        </div>
      </AppCard>

      {/* Students Matrix */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading student matrix...</div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Users size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            No Students Found
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Try adjusting your search query or branch filter.
          </p>
        </AppCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {filteredStudents.map((student) => {
            const isSelected = selectedInCreation.some((s) => s.id === student.id);
            const isInvited = sentInvites.some((inv) => inv.studentId === student.id);
            const isActing = actingStudentId === student.id;

            return (
              <AppCard
                key={student.id}
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isSelected ? '1.5px solid var(--color-primary)' : undefined,
                }}
              >
                <div>
                  <div
                    onClick={() => setPreviewStudent(student)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(11, 77, 136, 0.12)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {(student.fullName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {student.fullName}
                        <ExternalLink size={12} color="var(--color-text-secondary)" />
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                        {student.usn || 'USN N/A'} • {student.branch || 'Branch N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    {student.semester ? `Semester ${student.semester}` : ''} {student.section ? `• Sec ${student.section}` : ''}
                  </div>

                  {student.skills && student.skills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {student.skills.slice(0, 3).map((sk, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: 'var(--color-canvas)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                          }}
                        >
                          {sk}
                        </span>
                      ))}
                      {student.skills.length > 3 && (
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)', alignSelf: 'center' }}>
                          +{student.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                  {isRecruitingMode ? (
                    isInvited ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            color: 'var(--color-pending)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={13} /> Invited
                        </span>
                        <button
                          disabled={isActing}
                          onClick={() => handleCancelInvite(student.id, student.fullName)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-danger)',
                            color: 'var(--color-danger)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isActing ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isActing ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={isActing}
                        onClick={() => handleSendInvite(student)}
                        style={{
                          width: '100%',
                          padding: '7px',
                          borderRadius: '6px',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isActing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 0 #07335c',
                        }}
                      >
                        {isActing ? <Loader2 size={13} className="spin" /> : <UserPlus size={13} />}
                        Invite to Team
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleToggleCreationSelect(student)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--color-confirmed)' : 'white',
                        color: isSelected ? 'white' : 'var(--color-primary)',
                        border: isSelected ? 'none' : '1.5px solid var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Check size={14} /> Added to Selection
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Add Member
                        </>
                      )}
                    </button>
                  )}
                </div>
              </AppCard>
            );
          })}
        </div>
      )}

      {/* Preview Student Profile Modal */}
      <Modal
        isOpen={previewStudent !== null}
        onClose={() => setPreviewStudent(null)}
        title="Student Profile"
      >
        {previewStudent && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(11, 77, 136, 0.1)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  margin: '0 auto 10px',
                }}
              >
                {(previewStudent.fullName || '?')[0].toUpperCase()}
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                {previewStudent.fullName}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                {previewStudent.email}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '12px',
                background: 'var(--color-canvas)',
                borderRadius: '8px',
                marginBottom: '14px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>USN</div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{previewStudent.usn || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>BRANCH</div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{previewStudent.branch || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>SEMESTER</div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{previewStudent.semester || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>SECTION</div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{previewStudent.section || 'N/A'}</div>
              </div>
            </div>

            {previewStudent.skills && previewStudent.skills.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>SKILLS & TECH STACK</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {previewStudent.skills.map((s, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'white',
                        border: '1px solid var(--color-border)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
