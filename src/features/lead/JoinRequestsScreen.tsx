import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Check,
  X,
  Inbox,
  User,
  ExternalLink,
  Loader2,
  BookOpen,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { JoinRequestModel, ProfileModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';
import { StatusPill } from '../../components/common/StatusPill';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

export const JoinRequestsScreen: React.FC = () => {
  const { user } = useAuth();
  const { team, members, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<JoinRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  // Student Profile Preview Modal
  const [selectedStudent, setSelectedStudent] = useState<ProfileModel | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = await TeamService.fetchJoinRequests(team.id, false);
      setRequests(data);
    } catch (e) {
      console.error('Error fetching join requests:', e);
      showToast('Could not load join requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [team, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRespond = async (requestId: number, accept: boolean) => {
    setActingId(requestId);
    try {
      await TeamService.respondToJoinRequest(requestId, accept);
      showToast(accept ? 'Student accepted into team!' : 'Join request declined.', accept ? 'success' : 'info');
      await Promise.all([loadRequests(), refreshTeam()]);
    } catch (e: any) {
      console.error('Error responding to request:', e);
      showToast(e?.message || 'Could not update request status.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleInspectStudent = async (studentId: string) => {
    try {
      setLoadingProfile(true);
      const profile = await AuthService.fetchProfile(studentId);
      setSelectedStudent(profile);
    } catch (e) {
      console.error('Failed to load student profile:', e);
      showToast('Could not fetch student details', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const teammateIds = new Set<string>();
  if (team?.leaderId) teammateIds.add(team.leaderId);
  (members || []).forEach((m) => teammateIds.add(m.id));

  // Teammates already in the team must never show up as pending join requests
  const pending = requests.filter(
    (r) => r.status === 'PENDING' && !teammateIds.has(r.studentId) && !(r as any).isAlreadyTeammate
  );
  const resolved = requests.filter(
    (r) => r.status !== 'PENDING' || teammateIds.has(r.studentId) || (r as any).isAlreadyTeammate
  );

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={() => navigate('/lead/dashboard')}
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
            Back to Dashboard
          </button>

          <button
            onClick={loadRequests}
            title="Refresh requests"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'white',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Mascot Banner */}
        <div style={{ marginBottom: '20px' }}>
          <MascotCompanionBanner
            isLead={true}
            defaultMood="surprised"
            defaultMessage="Someone wants to join your team!"
          />
        </div>

        {/* Prominent ADD MEMBERS Button */}
        <button
          onClick={() => navigate('/team-formation/browse-students?isRecruitingMode=true')}
          className="btn btn-primary"
          style={{
            width: '100%',
            height: '52px',
            background: 'linear-gradient(115deg, #0b4d88 0%, #087da9 50%, #22b6c5 100%)',
            color: '#FFFFFF',
            border: '1px solid rgba(11, 77, 136, 0.4)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 0 #07335c, 0 8px 20px rgba(11, 77, 136, 0.35)',
            marginBottom: '28px',
          }}
        >
          <UserPlus size={19} />
          ADD MEMBERS
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading join requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(11, 77, 136, 0.08)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Inbox size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No Join Requests Yet
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Students who request to join your team will appear here.
            </p>
          </AppCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Pending Requests */}
            {pending.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  Pending Requests
                  <span
                    style={{
                      background: 'rgba(166, 120, 39, 0.12)',
                      color: 'var(--color-pending)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '12px',
                    }}
                  >
                    {pending.length}
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pending.map((req) => (
                    <AppCard key={req.id} style={{ padding: '18px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div
                          onClick={() => handleInspectStudent(req.studentId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: 'rgba(11, 77, 136, 0.12)',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {(req.studentName || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              {req.studentName}
                              <ExternalLink size={13} color="var(--color-text-secondary)" />
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {req.studentUsn || 'USN N/A'} · {req.studentBranch || 'Branch N/A'}
                            </div>
                          </div>
                        </div>

                        <StatusPill status={req.status} />
                      </div>

                      {req.message && (
                        <div
                          style={{
                            marginTop: '14px',
                            padding: '10px 14px',
                            background: 'var(--color-canvas)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            fontSize: '13px',
                            fontStyle: 'italic',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          "{req.message}"
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px',
                          marginTop: '16px',
                        }}
                      >
                        <button
                          disabled={actingId === req.id}
                          onClick={() => handleRespond(req.id, false)}
                          style={{
                            height: '40px',
                            background: 'transparent',
                            color: 'var(--color-danger)',
                            border: '1.5px solid var(--color-danger)',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: actingId === req.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <X size={16} />
                          Decline
                        </button>

                        <button
                          disabled={actingId === req.id}
                          onClick={() => handleRespond(req.id, true)}
                          style={{
                            height: '40px',
                            background: 'var(--color-confirmed)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: actingId === req.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 3px 0 #1e5950',
                          }}
                        >
                          {actingId === req.id ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <>
                              <Check size={16} />
                              Accept
                            </>
                          )}
                        </button>
                      </div>
                    </AppCard>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved Requests */}
            {resolved.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    margin: '0 0 12px 0',
                  }}
                >
                  Resolved Requests ({resolved.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {resolved.map((req) => (
                    <AppCard
                      key={req.id}
                      style={{
                        padding: '14px 18px',
                        opacity: 0.85,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div
                        onClick={() => handleInspectStudent(req.studentId)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--color-canvas)',
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                          }}
                        >
                          {(req.studentName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {req.studentName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {req.studentUsn || 'USN N/A'} · {req.studentBranch || 'Branch N/A'}
                          </div>
                        </div>
                      </div>

                      <StatusPill status={req.status} />
                    </AppCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Student Profile Inspection Modal */}
        <Modal
          isOpen={selectedStudent !== null}
          onClose={() => setSelectedStudent(null)}
          title="Student Profile"
        >
          {selectedStudent && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(11, 77, 136, 0.1)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    margin: '0 auto 12px',
                  }}
                >
                  {(selectedStudent.fullName || '?')[0].toUpperCase()}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  {selectedStudent.fullName}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {selectedStudent.email}
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  padding: '14px',
                  background: 'var(--color-canvas)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    USN
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {selectedStudent.usn || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Branch
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {selectedStudent.branch || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Semester
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {selectedStudent.semester || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Section
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {selectedStudent.section || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    SKILLS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedStudent.skills.map((skill, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'white',
                          border: '1px solid var(--color-border)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
