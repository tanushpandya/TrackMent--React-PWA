import React, { useEffect, useState, useMemo } from 'react';
import { Search, X, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TeamService } from '../../services/team.service';
import { TeamModel, ProfileModel, TeamEvaluation } from '../../types';
import { Modal } from '../../components/common/Modal';

export interface ExtractMarksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamModel[];
}

interface StudentMarkRow {
  teamCode: string;
  teamName: string;
  teamId: number;
  studentId: string;
  studentName: string;
  usn: string;
  email: string;
  isLead: boolean;
  phase1: number | null;
  phase1Max: number | null;
  phase2: number | null;
  phase2Max: number | null;
  phase3: number | null;
  phase3Max: number | null;
}

export const ExtractMarksDialog: React.FC<ExtractMarksDialogProps> = ({
  isOpen,
  onClose,
  teams,
}) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StudentMarkRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen || teams.length === 0) return;

    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const compiledRows: StudentMarkRow[] = [];

        await Promise.all(
          teams.map(async (team) => {
            const [roster, evals] = await Promise.all([
              TeamService.fetchRoster(team.id),
              TeamService.fetchTeamEvaluations(team.id),
            ]);

            const realEvals = evals.filter((e) => e.phaseName !== '__MARKS_VISIBILITY__');

            for (const member of roster) {
              const isLead = member.id === team.leaderId;

              // Find phase 1 evaluation
              const p1 = realEvals.find((e) => e.phaseName.toLowerCase().includes('1'));
              const p1Score = p1
                ? p1.memberMarks && p1.memberMarks[member.id] !== undefined
                  ? p1.memberMarks[member.id]
                  : p1.totalMarks
                : null;

              // Find phase 2 evaluation
              const p2 = realEvals.find((e) => e.phaseName.toLowerCase().includes('2'));
              const p2Score = p2
                ? p2.memberMarks && p2.memberMarks[member.id] !== undefined
                  ? p2.memberMarks[member.id]
                  : p2.totalMarks
                : null;

              // Find phase 3 evaluation
              const p3 = realEvals.find((e) => e.phaseName.toLowerCase().includes('3'));
              const p3Score = p3
                ? p3.memberMarks && p3.memberMarks[member.id] !== undefined
                  ? p3.memberMarks[member.id]
                  : p3.totalMarks
                : null;

              compiledRows.push({
                teamCode: team.teamCode,
                teamName: team.teamName,
                teamId: team.id,
                studentId: member.id,
                studentName: member.fullName || 'Student',
                usn: member.usn || '',
                email: member.email || '',
                isLead,
                phase1: p1Score,
                phase1Max: p1 ? p1.maxMarks : null,
                phase2: p2Score,
                phase2Max: p2 ? p2.maxMarks : null,
                phase3: p3Score,
                phase3Max: p3 ? p3.maxMarks : null,
              });
            }
          })
        );

        if (isMounted) {
          setRows(compiledRows);
        }
      } catch (err) {
        console.error('Error compiling marks:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, teams]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.usn.toLowerCase().includes(q) ||
        r.teamCode.toLowerCase().includes(q) ||
        r.teamName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const handleDownloadExcel = () => {
    if (rows.length === 0) return;

    const data = filteredRows.map((r) => {
      const total =
        r.phase1 !== null || r.phase2 !== null || r.phase3 !== null
          ? (r.phase1 || 0) + (r.phase2 || 0) + (r.phase3 || 0)
          : null;

      return {
        'Team Code': r.teamCode,
        'Team Name': r.teamName,
        'Student Name': r.studentName,
        USN: r.usn,
        Role: r.isLead ? 'Team Lead' : 'Member',
        'Phase 1': r.phase1 !== null ? `${r.phase1}/${r.phase1Max || 50}` : '-',
        'Phase 2': r.phase2 !== null ? `${r.phase2}/${r.phase2Max || 50}` : '-',
        'Phase 3': r.phase3 !== null ? `${r.phase3}/${r.phase3Max || 50}` : '-',
        'Total Marks': total !== null ? total : '-',
        Email: r.email,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TrackMent Marks');
    XLSX.writeFile(workbook, `TrackMent_Academic_Marks_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;

    const headers = [
      'Team Code',
      'Team Name',
      'Student Name',
      'USN',
      'Role',
      'Phase 1',
      'Phase 2',
      'Phase 3',
      'Total Marks',
      'Email',
    ];

    const csvRows = filteredRows.map((r) => {
      const total =
        r.phase1 !== null || r.phase2 !== null || r.phase3 !== null
          ? (r.phase1 || 0) + (r.phase2 || 0) + (r.phase3 || 0)
          : '';

      return [
        `"${r.teamCode}"`,
        `"${r.teamName}"`,
        `"${r.studentName}"`,
        `"${r.usn}"`,
        `"${r.isLead ? 'Team Lead' : 'Member'}"`,
        r.phase1 !== null ? r.phase1 : '',
        r.phase2 !== null ? r.phase2 : '',
        r.phase3 !== null ? r.phase3 : '',
        total,
        `"${r.email}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrackMent_Marks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extract Academic Marks"
      subtitle={`Comprehensive milestone marks across ${teams.length} assigned teams (${rows.length} students)`}
      maxWidth={900}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: '#F8FAFC',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, USN, team..."
              style={{
                width: '100%',
                padding: '8px 32px 8px 32px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={loading || rows.length === 0}
              onClick={handleDownloadExcel}
              style={{
                background: '#107C41',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <FileSpreadsheet size={15} /> Download Excel (.xlsx)
            </button>

            <button
              type="button"
              disabled={loading || rows.length === 0}
              onClick={handleDownloadCsv}
              style={{
                background: '#FFFFFF',
                color: '#1E3A8A',
                border: '1px solid #93C5FD',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Compiling student marks across all assigned teams...
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No students found matching "{searchQuery}".
          </div>
        ) : (
          <div
            style={{
              maxHeight: '440px',
              overflowY: 'auto',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12.5,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Team</th>
                  <th style={{ padding: '10px 12px' }}>Student</th>
                  <th style={{ padding: '10px 12px' }}>USN</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Phase 1</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Phase 2</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Phase 3</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const total =
                    r.phase1 !== null || r.phase2 !== null || r.phase3 !== null
                      ? (r.phase1 || 0) + (r.phase2 || 0) + (r.phase3 || 0)
                      : null;

                  return (
                    <tr
                      key={`${r.teamId}-${r.studentId}`}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#0B4D88',
                            background: '#EAF4F7',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            marginRight: 6,
                          }}
                        >
                          {r.teamCode}
                        </span>
                        <span style={{ color: '#64748B' }}>{r.teamName}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{r.studentName}</div>
                        {r.isLead && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#997027',
                              background: '#FFF3D7',
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                          >
                            LEAD
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748B', fontFamily: 'monospace' }}>
                        {r.usn || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {r.phase1 !== null ? (
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>
                            {r.phase1}
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>/{r.phase1Max || 50}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {r.phase2 !== null ? (
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>
                            {r.phase2}
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>/{r.phase2Max || 50}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {r.phase3 !== null ? (
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>
                            {r.phase3}
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>/{r.phase3Max || 50}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>
                        {total !== null ? (
                          <span style={{ color: '#107C41' }}>{total}</span>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
