import React from 'react';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const norm = (status || '').toUpperCase().trim();

  let bg = '#E5F3FA';
  let text = '#102F48';

  if (['CONFIRMED', 'ACCEPTED', 'VERIFIED', 'COMPLETED', 'ON TRACK'].includes(norm)) {
    bg = '#E4F6F0';
    text = '#328F81';
  } else if (['PENDING', 'REQUESTED', 'REVIEW', 'IN PROGRESS', 'UPCOMING'].includes(norm)) {
    bg = '#FFF4D8';
    text = '#A67827';
  } else if (['REJECTED', 'CANCELLED', 'DANGER', 'NEEDS UPDATES'].includes(norm)) {
    bg = '#FBECEB';
    text = '#B34F5C';
  } else if (['LEAD', 'TEAM_LEAD'].includes(norm)) {
    bg = '#FFF3D7';
    text = '#997027';
  } else if (['MENTOR'].includes(norm)) {
    bg = '#EDEBFA';
    text = '#6D65A5';
  } else if (['STUDENT', 'MEMBER'].includes(norm)) {
    bg = '#E5F3FA';
    text = '#207198';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        borderRadius: 99,
        padding: size === 'sm' ? '3px 8px' : '5px 12px',
        fontSize: size === 'sm' ? 10 : 11.5,
        fontWeight: 850,
        letterSpacing: '0.3px',
        background: bg,
        color: text,
      }}
    >
      {norm}
    </span>
  );
};
