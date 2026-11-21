import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ListTodo,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Wand2,
} from 'lucide-react';
import { TeamModel } from '../../types';
import { TeamService } from '../../services/team.service';
import { AppCard } from '../common/AppCard';

export interface ObjectiveChecklistItem {
  text: string;
  completed: boolean;
}

export function parseObjectives(raw?: string): ObjectiveChecklistItem[] {
  if (!raw || !raw.trim()) return [];
  
  // Check if formatted with markdown checkbox list
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const hasCheckboxes = lines.some((l) => /^(- )?\[[ xX]\]/.test(l));

  if (hasCheckboxes) {
    const items: ObjectiveChecklistItem[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('- [x] ') || lower.startsWith('[x] ')) {
        const text = line.replace(/^(- )?\[[xX]\]\s*/, '').trim();
        if (text) items.push({ text, completed: true });
      } else if (lower.startsWith('- [ ] ') || lower.startsWith('[ ] ')) {
        const text = line.replace(/^(- )?\[\s*\]\s*/, '').trim();
        if (text) items.push({ text, completed: false });
      } else {
        const cleaned = line.replace(/^[-•*]\s+/, '').trim();
        if (cleaned) items.push({ text: cleaned, completed: false });
      }
    }
    return items;
  }

  // If there are bullet points
  const hasBullets = lines.some((l) => /^[-•*]\s+/.test(l));
  if (hasBullets) {
    return lines.map((l) => ({
      text: l.replace(/^[-•*]\s+/, '').trim(),
      completed: false,
    }));
  }

  // If it's a raw unformatted paragraph (e.g. abstract accidentally pasted or single long text)
  if (lines.length === 1 && lines[0].length > 180) {
    // Split into sentences if it's a huge block of text with multiple sentences
    const sentences = lines[0]
      .split(/(?<=[.?!])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);
    if (sentences.length > 1) {
      return sentences.map((s) => ({ text: s, completed: false }));
    }
  }

  return lines.map((line) => ({
    text: line.trim(),
    completed: false,
  }));
}

export function serializeObjectives(items: ObjectiveChecklistItem[]): string {
  return items.map((i) => `${i.completed ? '[x]' : '[ ]'} ${i.text.trim()}`).join('\n');
}

const RVCE_QUICK_SUGGESTIONS = [
  'Literature Survey & Problem Formulation (Phase 1)',
  'System Architecture & Database Schema Design',
  'Core Algorithm / Module Implementation (Phase 2)',
  'Frontend / Mobile Integration & User Verification',
  'Continuous Testing, Documentation & Final Presentation (Phase 3)',
];

interface Props {
  team: TeamModel;
  isLeader?: boolean;
  onUpdated?: () => void;
  compact?: boolean;
}

export const ObjectivesChecklistWidget: React.FC<Props> = ({
  team,
  isLeader = false,
  onUpdated,
  compact = false,
}) => {
  const [items, setItems] = useState<ObjectiveChecklistItem[]>(() =>
    parseObjectives(team.objectives)
  );
  const [newText, setNewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isSaving) {
      setItems(parseObjectives(team.objectives));
    }
  }, [team.objectives, isSaving]);

  const completedCount = items.filter((i) => i.completed).length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handlePersist = async (newItems: ObjectiveChecklistItem[]) => {
    const prev = [...items];
    setItems(newItems);
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const serialized = serializeObjectives(newItems);
      await TeamService.updateProjectInfo({
        teamId: team.id,
        projectTitle: team.projectTitle,
        projectGist: team.projectGist,
        theme: team.theme,
        branch: team.branch,
        abstractText: team.abstractText,
        objectives: serialized,
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setItems(prev);
      setErrorMsg(err.message || 'Failed to save objectives update.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (index: number) => {
    if (!isLeader || isSaving) return;
    const next = [...items];
    next[index] = { ...next[index], completed: !next[index].completed };
    handlePersist(next);
  };

  const handleDelete = (index: number) => {
    if (!isLeader || isSaving) return;
    const next = items.filter((_, i) => i !== index);
    handlePersist(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader || isSaving || !newText.trim()) return;
    const next = [...items, { text: newText.trim(), completed: false }];
    setNewText('');
    handlePersist(next);
  };

  const handleAddTemplate = (suggestion: string) => {
    if (!isLeader || isSaving) return;
    if (items.some((i) => i.text.toLowerCase() === suggestion.toLowerCase())) return;
    const next = [...items, { text: suggestion, completed: false }];
    handlePersist(next);
  };

  return (
    <AppCard
      title="Objectives & Deliverables Checklist"
      subtitle={
        isLeader
          ? 'Track and check off key milestones as your team delivers project objectives.'
          : 'Milestones and deliverables established by your team lead.'
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Progress & Status Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(244, 250, 252, 0.95), rgba(229, 243, 250, 0.75))',
            borderRadius: 16,
            border: '1.5px solid #D5E8EF',
            boxShadow: '0 2px 10px rgba(11, 77, 136, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0B4D88, #22B6C5)',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(11, 77, 136, 0.2)',
                flexShrink: 0,
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#102F48', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Milestone Deliverables</span>
                {isSaving && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#0B4D88', fontWeight: 600 }}>
                    <Loader2 size={12} className="spin" />
                    Saving...
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#5E788C', marginTop: 2 }}>
                {completedCount} of {items.length} deliverables completed
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 99,
                background: progressPct === 100 ? '#ECFDF5' : '#E5F3FA',
                border: progressPct === 100 ? '1px solid #A7F3D0' : '1px solid #BAE6FD',
                color: progressPct === 100 ? '#059669' : '#0B4D88',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              {progressPct === 100 ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
              <span>{progressPct}% Done</span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Fill Bar */}
        {items.length > 0 && (
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 99,
              background: '#E2E8F0',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background:
                  progressPct === 100
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : 'linear-gradient(90deg, #0B4D88 0%, #22B6C5 100%)',
                borderRadius: 99,
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#FBECEB',
              border: '1px solid rgba(179, 79, 92, 0.3)',
              color: '#B34F5C',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Items Checklist List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                borderRadius: 16,
                border: '1.5px dashed #D5E8EF',
                background: '#FFFFFF',
                color: '#5E788C',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: '#F4FAFC',
                  color: '#7992A1',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <CheckCircle2 size={26} color="#7992A1" />
              </div>
              <div style={{ fontWeight: 800, color: '#102F48', fontSize: 14 }}>
                No checklist objectives recorded yet
              </div>
              <p style={{ margin: '6px auto 14px', maxWidth: 420, fontSize: 12.5, color: '#7992A1' }}>
                {isLeader
                  ? 'Add your project milestones or choose from standard RVCE curriculum deliverables below.'
                  : 'Your team lead will establish project milestones and deliverables here.'}
              </p>

              {isLeader && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                  {RVCE_QUICK_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddTemplate(sug)}
                      disabled={isSaving}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 20,
                        background: '#F0F9FF',
                        border: '1px solid #BAE6FD',
                        color: '#0369A1',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E0F2FE';
                        e.currentTarget.style.borderColor = '#0284C7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F0F9FF';
                        e.currentTarget.style.borderColor = '#BAE6FD';
                      }}
                    >
                      <Plus size={12} />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            items.map((item, idx) => {
              const isLong = item.text.length > 140;
              const isExpanded = expandedIndex === idx;
              const displayText = isLong && !isExpanded ? item.text.slice(0, 140) + '...' : item.text;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: item.completed ? '1.5px solid #E2E8F0' : '1.5px solid #D5E8EF',
                    background: item.completed ? '#F8FAFC' : '#FFFFFF',
                    boxShadow: item.completed
                      ? 'none'
                      : '0 2px 8px rgba(12, 64, 101, 0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    onClick={() => handleToggle(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      flex: 1,
                      minWidth: 0,
                      cursor: isLeader && !isSaving ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                    title={isLeader ? 'Click to toggle completion' : 'Read-only milestone'}
                  >
                    {/* Custom Styled Checkbox Button */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        border: item.completed ? '2px solid #10B981' : '2px solid #CBD5E1',
                        background: item.completed ? '#10B981' : '#FFFFFF',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#FFFFFF',
                        marginTop: 1,
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: item.completed ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                    >
                      {item.completed && <CheckCircle2 size={16} color="#FFFFFF" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          color: item.completed ? '#94A3B8' : '#1E293B',
                          textDecoration: item.completed ? 'line-through' : 'none',
                          fontWeight: item.completed ? 500 : 600,
                          wordBreak: 'break-word',
                        }}
                      >
                        {displayText}
                      </div>

                      {isLong && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedIndex(isExpanded ? null : idx);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0B4D88',
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: '2px 0 0',
                            marginTop: 4,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          {isExpanded ? (
                            <>Show less <ChevronUp size={13} /></>
                          ) : (
                            <>Read full deliverable <ChevronDown size={13} /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}>
                    {!isLeader && (
                      <span title="Editable by Team Lead only" style={{ color: '#94A3B8' }}>
                        <Lock size={15} />
                      </span>
                    )}
                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        disabled={isSaving}
                        title="Remove deliverable"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: 'none',
                          background: 'transparent',
                          color: '#94A3B8',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#E11D48';
                          e.currentTarget.style.background = '#FFF1F2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94A3B8';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Suggestions if few items (Team Lead Only) */}
        {isLeader && items.length > 0 && items.length < 5 && (
          <div style={{ marginTop: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7992A1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wand2 size={12} color="#0B4D88" />
              <span>Suggested Institutional Deliverables:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {RVCE_QUICK_SUGGESTIONS.filter(
                (sug) => !items.some((i) => i.text.toLowerCase().includes(sug.slice(0, 15).toLowerCase()))
              ).slice(0, 3).map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddTemplate(sug)}
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 16,
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E0F2FE';
                    e.currentTarget.style.borderColor = '#0284C7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F0F9FF';
                    e.currentTarget.style.borderColor = '#BAE6FD';
                  }}
                >
                  <Plus size={11} />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add New Milestone Form (Team Lead Only) */}
        {isLeader && (
          <form
            onSubmit={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 4,
            }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                disabled={isSaving}
                placeholder="Add a new milestone or deliverable (e.g. Implement Supabase Auth)..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0B4D88';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11, 77, 136, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isSaving || !newText.trim()}
              style={{
                height: 44,
                padding: '0 20px',
                borderRadius: 12,
                border: 'none',
                background: !newText.trim() || isSaving
                  ? '#CBD5E1'
                  : 'linear-gradient(135deg, #0B4D88, #22B6C5)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: !newText.trim() || isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: !newText.trim() || isSaving ? 'none' : '0 4px 12px rgba(11, 77, 136, 0.25)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={16} />
              <span>Add Deliverable</span>
            </button>
          </form>
        )}
      </div>
    </AppCard>
  );
};
