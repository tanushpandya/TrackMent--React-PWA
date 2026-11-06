import React, { useState } from 'react';
import { FluidMascot, MascotMood } from './FluidMascot';
import { useToast } from '../../context/ToastContext';

interface MascotCompanionBannerProps {
  defaultMood?: MascotMood;
  defaultMessage?: string;
  subtitle?: string;
  isLead?: boolean;
}

export const MascotCompanionBanner: React.FC<MascotCompanionBannerProps> = ({
  defaultMood = 'happy',
  defaultMessage = 'I’m here to help you keep moving.',
  subtitle = 'Your friendly project companion is cheering you on.',
}) => {
  const [cheered, setCheered] = useState(false);
  const { showToast } = useToast();

  const toggleCheer = () => {
    const next = !cheered;
    setCheered(next);
    showToast(next ? 'You’ve got this! ✨' : 'I’m here for you! ✨');
  };

  const activeMood: MascotMood = cheered ? 'excited' : defaultMood;
  const activeMessage = cheered
    ? 'You’ve got this! Every step moves your project forward ✨'
    : defaultMessage;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        maxWidth: 680,
        margin: '0 0 24px 0',
        padding: '14px 20px',
        borderRadius: 20,
        background: 'linear-gradient(115deg, rgba(255, 255, 255, 0.92), rgba(212, 241, 245, 0.82))',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        boxShadow: '0 10px 28px rgba(39, 104, 137, 0.12)',
        animation: 'pageIn 0.4s ease both',
      }}
    >
      <FluidMascot mood={activeMood} size={78} onTap={toggleCheer} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 850,
            color: '#102F48',
            lineHeight: 1.4,
          }}
        >
          {activeMessage}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#5E788C',
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
        <button
          onClick={toggleCheer}
          style={{
            marginTop: 6,
            padding: 0,
            background: 'none',
            border: 'none',
            color: '#1972A0',
            fontSize: 11.5,
            fontWeight: 850,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {cheered ? 'I’m cheering for you! ✨' : 'Tap to cheer me up ✨'}
        </button>
      </div>
    </div>
  );
};
