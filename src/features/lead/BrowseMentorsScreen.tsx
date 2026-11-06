import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  RefreshCw,
  Send,
  Mail,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCheck,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { ProfileModel, MentorRequestModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

const BRANCH_FILTERS = [
  { code: 'CSE', label: 'CSE', keywords: ['cse', 'computer science'] },
  { code: 'ISE', label: 'ISE', keywords: ['ise', 'information science'] },
  { code: 'AIML', label: 'AIML', keywords: ['aiml', 'artificial intelligence', 'machine learning'] },
  { code: 'ECE', label: 'ECE', keywords: ['ece', 'electronics & communication', 'electronics and communication'] },
  { code: 'EEE', label: 'EEE', keywords: ['eee', 'electrical & electronics'] },
  { code: 'ME', label: 'ME', keywords: ['me', 'mechanical'] },
  { code: 'CV', label: 'CV', keywords: ['cv', 'civil'] },
  { code: 'CD', label: 'CD (Design)', keywords: ['cd', 'design'] },
  { code: 'CY', label: 'CY (Cyber)', keywords: ['cy', 'cyber security'] },
  { code: 'ETE', label: 'ETE (Telecom)', keywords: ['ete', 'telecommunication'] },
  { code: 'IEM', label: 'IEM', keywords: ['iem', 'industrial'] },
  { code: 'BT', label: 'BT', keywords: ['bt', 'biotechnology'] },
  { code: 'CHEM', label: 'CHEM', keywords: ['chem', 'chemical'] },
];

export const BrowseMentorsScreen: React.FC = () => {
  const { user } = useAuth();
  const { team, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mentors, setMentors] = useState<ProfileModel[]>([]);
  const [sentRequests, setSentRequests] = useState<MentorRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // Send request modal
  const [targetMentor, setTargetMentor] = useState<ProfileModel | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const [allMentors, requests] = await Promise.all([
        TeamService.listFacultyMentors(),
        TeamService.fetchTeamSentMentorRequests(team.id),
      ]);
      setMentors(allMentors);
      setSentRequests(requests);
    } catch (e) {
      console.error('Failed to load mentors:', e);
      showToast('Could not load faculty mentors', 'error');
    } finally {
      setLoading(false);
    }
  }, [team, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendRequest = async () => {
    if (!targetMentor || !team) return;
    setSending(true);
    try {
      await TeamService.sendMentorRequest(team.id, targetMentor.id, requestMessage);
      showToast(`Mentorship request sent to Prof. ${targetMentor.fullName}!`, 'success');
      setTargetMentor(null);
      setRequestMessage('');
      await loadData();
    } catch (e: any) {
      console.error('Error sending mentor request:', e);
      showToast(e?.message || 'Could not send request.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCancelRequest = async (mentorId: string, mentorName?: string) => {
    if (!team) return;
    setCancellingId(mentorId);
    try {
      await TeamService.cancelMentorRequest(team.id, mentorId);
      showToast(`Cancelled mentorship request to Prof. ${mentorName || 'Faculty'}.`, 'info');
      await loadData();
    } catch (e: any) {
      console.error('Error cancelling request:', e);
      showToast(e?.message || 'Could not cancel request.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // If already assigned
  if (team?.mentorId) {
    return (
      <div style={{ minHeight: '100vh', padding: '40px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
          <AppCard style={{ padding: '36px 24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(50, 143, 129, 0.12)',
                color: 'var(--color-confirmed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 8px 0' }}>
              Faculty Mentor Already Assigned
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <strong>{team.teamName}</strong> is already under the mentorship of{' '}
              <strong>Prof. {mentor?.fullName || 'Faculty Mentor'}</strong>.
            </p>

            <button
              onClick={() => navigate('/lead/dashboard')}
              style={{
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 0 #07335c',
              }}
            >
              Return to Dashboard
            </button>
          </AppCard>
        </div>
      </div>
    );
  }

  // Filter mentors
  const filteredMentors = mentors.filter((m) => {
    // Branch filter
    if (selectedBranch) {
      const opt = BRANCH_FILTERS.find((b) => b.code === selectedBranch);
      const dept = (m.department || '').toLowerCase();
      const branch = (m.branch || '').toLowerCase();
      const codeMatch = dept.includes(selectedBranch.toLowerCase()) || branch.includes(selectedBranch.toLowerCase());
      const kwMatch = opt ? opt.keywords.some((kw) => dept.includes(kw) || branch.includes(kw)) : false;
      if (!codeMatch && !kwMatch) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (m.fullName || '').toLowerCase();
      const code = (m.facultyCode || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      return name.includes(q) || code.includes(q) || email.includes(q) || dept.includes(q);
    }

    return true;
  });

  const pendingMentorRequests = sentRequests.filter((r) => r.status === 'PENDING');

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '960px' }}>
        {/* Navigation Back */}
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
            onClick={loadData}
            title="Refresh faculty list"
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

        {/* Mascot Companion Banner */}
        <div style={{ marginBottom: '20px' }}>
          <MascotCompanionBanner
            isLead={true}
            defaultMood="thinking"
            defaultMessage="The right mentor can help your idea grow."
          />
        </div>

        {/* Top Search & Filter Header */}
        <AppCard style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 4px 0',
              }}
            >
              Find & Ask a Faculty Mentor
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
              Search RVCE faculty by name or 4-digit faculty code, or filter by branch to ask for mentorship of{' '}
              <strong>"{team?.teamName}"</strong>.
            </p>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search
              size={18}
              color="var(--color-text-secondary)"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Faculty Name, 4-digit Faculty Code (e.g. 1042), or Email..."
              style={{
                width: '100%',
                padding: '12px 40px 12px 42px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-canvas)',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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

          {/* Branch Filter Chips */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            <button
              onClick={() => setSelectedBranch(null)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: selectedBranch === null ? 'var(--color-primary)' : 'var(--color-border)',
                background: selectedBranch === null ? 'rgba(11, 77, 136, 0.12)' : 'white',
                color: selectedBranch === null ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontSize: '12px',
                fontWeight: selectedBranch === null ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All Branches
            </button>
            {BRANCH_FILTERS.map((b) => {
              const isSelected = selectedBranch === b.code;
              return (
                <button
                  key={b.code}
                  onClick={() => setSelectedBranch(isSelected ? null : b.code)}
                  style={{
                    padding: '6px 14px',
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
                  {b.label}
                </button>
              );
            })}
          </div>
        </AppCard>

        {/* Pending Requests Banner */}
        {pendingMentorRequests.length > 0 && (
          <div
            style={{
              background: 'rgba(11, 77, 136, 0.08)',
              border: '1px solid rgba(11, 77, 136, 0.2)',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <Mail size={18} color="var(--color-primary)" />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', flex: 1 }}>
              Pending mentorship request{pendingMentorRequests.length > 1 ? 's' : ''} sent to:{' '}
              {pendingMentorRequests.map((r) => `Prof. ${r.mentorName || 'Faculty'}`).join(', ')}
            </div>
          </div>
        )}

        {/* Faculty List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading faculty mentors...</div>
          </div>
        ) : filteredMentors.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
            <HelpCircle size={44} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No faculty mentors match your search or filter
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Try searching with another keyword or resetting the branch filter.
            </p>
            {(searchQuery || selectedBranch) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBranch(null);
                }}
                style={{
                  background: 'transparent',
                  border: '1.5px solid var(--color-border)',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            )}
          </AppCard>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            {filteredMentors.map((mentorItem) => {
              const pendingReq = sentRequests.find(
                (r) => r.mentorId === mentorItem.id && r.status === 'PENDING'
              );
              const isCancelling = cancellingId === mentorItem.id;

              return (
                <AppCard
                  key={mentorItem.id}
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
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
                      {(mentorItem.fullName || 'F')[0].toUpperCase()}
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          Prof. {mentorItem.fullName}
                        </span>
                        {mentorItem.facultyCode && (
                          <span
                            style={{
                              background: 'var(--color-canvas)',
                              border: '1px solid var(--color-border)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--color-primary)',
                            }}
                          >
                            Code: {mentorItem.facultyCode}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '12.5px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '3px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {mentorItem.department && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={13} />
                            {mentorItem.department}
                          </span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={13} />
                          {mentorItem.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {pendingReq ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            background: 'rgba(166, 120, 39, 0.1)',
                            color: 'var(--color-pending)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Clock size={14} />
                          Request Sent
                        </span>
                        <button
                          disabled={isCancelling}
                          onClick={() => handleCancelRequest(mentorItem.id, mentorItem.fullName)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-danger)',
                            color: 'var(--color-danger)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: isCancelling ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isCancelling ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setTargetMentor(mentorItem)}
                        style={{
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 0 #07335c',
                        }}
                      >
                        <Send size={14} />
                        Ask for Mentorship
                      </button>
                    )}
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}

        {/* Mentorship Request Modal */}
        <Modal
          isOpen={targetMentor !== null}
          onClose={() => setTargetMentor(null)}
          title={`Ask Prof. ${targetMentor?.fullName || ''} to Mentor`}
        >
          {targetMentor && (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Send an official invitation to <strong>Prof. {targetMentor.fullName}</strong> requesting mentorship for{' '}
                <strong>{team?.teamName}</strong>. You may include an introductory note about your project.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginBottom: '6px',
                  }}
                >
                  Message / Project Pitch (Optional)
                </label>
                <textarea
                  rows={4}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. Respected Professor, our project focuses on developing an automated edge-AI solution for agricultural diagnostics. We would be honored to have your guidance..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '13.5px',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setTargetMentor(null)}
                  style={{
                    height: '42px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleSendRequest}
                  style={{
                    height: '42px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 0 #07335c',
                  }}
                >
                  {sending ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <>
                      <Send size={14} />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
