import React, { useState, useEffect } from 'react';

export type MascotMood =
  | 'happy'
  | 'excited'
  | 'nervous'
  | 'worried'
  | 'thinking'
  | 'surprised'
  | 'encouraging';

interface FluidMascotProps {
  mood?: MascotMood;
  message?: string;
  size?: number;
  onTap?: () => void;
}

export const FluidMascot: React.FC<FluidMascotProps> = ({
  mood = 'happy',
  message,
  size = 86,
  onTap,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3400);

    return () => clearInterval(blinkInterval);
  }, []);

  const s = size;
  const isExcited = mood === 'excited';
  const isWide = mood === 'surprised' || mood === 'excited';
  const isThinking = mood === 'thinking';

  // Eyebrow angles & offsets
  const getBrowTransform = (isLeft: boolean) => {
    let angle = 0;
    let dy = 0;
    if (mood === 'worried' || mood === 'nervous') {
      angle = isLeft ? -14 : 14;
    } else if (mood === 'thinking') {
      angle = isLeft ? -16 : 4;
      dy = isLeft ? -2 : 0;
    } else if (mood === 'surprised' || mood === 'excited') {
      dy = -3;
    } else if (mood === 'encouraging') {
      angle = isLeft ? -6 : 6;
    }
    return `translateY(${dy}px) rotate(${angle}deg)`;
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`TrackMent companion mascot, feeling ${mood}`}
        onClick={onTap}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap?.();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: s,
          height: s,
          position: 'relative',
          cursor: onTap ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isHovered
            ? 'scale(1.06) translateY(-4px)'
            : isExcited
            ? 'scale(1.04) translateY(-3px)'
            : 'none',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Organic fluid cobalt-cyan body matching styles.css and fluid_mascot.dart */}
        <div
          style={{
            width: s * 0.88,
            height: s * 0.84,
            borderRadius: '48% 52% 43% 57% / 46% 44% 56% 54%',
            background:
              'radial-gradient(ellipse at 31% 25%, #55DCDF 0%, #278FCC 20%, #145CA1 51%, #133F7C 79%, #0D2F65 100%)',
            border: '1.4px solid rgba(165, 250, 255, 0.55)',
            boxShadow:
              'inset -6px -6px 12px rgba(4, 28, 70, 0.35), inset 5px 6px 9px rgba(165, 250, 255, 0.38), 0 10px 22px rgba(17, 73, 123, 0.28)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Top-left cyan/white glossy specular highlight */}
          <div
            style={{
              position: 'absolute',
              top: s * 0.08,
              left: s * 0.14,
              width: s * 0.3,
              height: s * 0.12,
              borderRadius: s * 0.12,
              background: 'rgba(255, 255, 255, 0.38)',
              transform: 'rotate(-20deg)',
              pointerEvents: 'none',
            }}
          />

          {/* Expressive Eyebrows */}
          <div
            style={{
              position: 'absolute',
              top: s * 0.2,
              display: 'flex',
              gap: s * 0.2,
            }}
          >
            <div
              style={{
                width: s * 0.13,
                height: 2.4,
                borderRadius: 2,
                background: 'rgba(221, 253, 255, 0.85)',
                transform: getBrowTransform(true),
                transition: 'transform 0.2s ease',
              }}
            />
            <div
              style={{
                width: s * 0.13,
                height: 2.4,
                borderRadius: 2,
                background: 'rgba(221, 253, 255, 0.85)',
                transform: getBrowTransform(false),
                transition: 'transform 0.2s ease',
              }}
            />
          </div>

          {/* 2 Cute Glossy Eyes */}
          <div
            style={{
              position: 'absolute',
              top: s * 0.28,
              display: 'flex',
              gap: s * 0.16,
            }}
          >
            {[0, 1].map((idx) => {
              const eyeW = s * (isWide ? 0.155 : 0.145);
              const eyeH = isBlinking ? 2.5 : s * (isWide ? 0.195 : 0.18);

              return (
                <div
                  key={idx}
                  style={{
                    width: eyeW,
                    height: eyeH,
                    borderRadius: isBlinking ? 2 : eyeH,
                    background: '#062A4C',
                    border: isBlinking ? 'none' : '1.8px solid rgba(221, 253, 255, 0.65)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'height 0.08s ease',
                    marginTop: isBlinking ? s * 0.08 : 0,
                  }}
                >
                  {!isBlinking && (
                    <>
                      {/* Main specular catchlight */}
                      <div
                        style={{
                          position: 'absolute',
                          top: isThinking ? eyeH * 0.1 : eyeH * 0.16,
                          left: isThinking ? eyeW * 0.34 : eyeW * 0.18,
                          width: eyeW * 0.38,
                          height: eyeW * 0.38,
                          borderRadius: '50%',
                          background: '#ffffff',
                        }}
                      />
                      {/* Secondary sparkle */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: eyeH * 0.16,
                          right: eyeW * 0.18,
                          width: eyeW * 0.18,
                          height: eyeW * 0.18,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.85)',
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cute Rosy Cheeks */}
          <div
            style={{
              position: 'absolute',
              top: s * 0.46,
              display: 'flex',
              gap: s * 0.36,
            }}
          >
            <div
              style={{
                width: s * 0.12,
                height: s * 0.055,
                borderRadius: s * 0.06,
                background: 'rgba(255, 154, 184, 0.65)',
              }}
            />
            <div
              style={{
                width: s * 0.12,
                height: s * 0.055,
                borderRadius: s * 0.06,
                background: 'rgba(255, 154, 184, 0.65)',
              }}
            />
          </div>

          {/* Expressive Mouth */}
          <div
            style={{
              position: 'absolute',
              top: s * 0.52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mood === 'excited' ? (
              <div
                style={{
                  width: s * 0.22,
                  height: s * 0.15,
                  borderRadius: '4px 4px 14px 14px',
                  background: '#062A4C',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: s * 0.14,
                    height: s * 0.07,
                    borderRadius: '8px 8px 0 0',
                    background: '#FF8FA8',
                  }}
                />
              </div>
            ) : mood === 'worried' || mood === 'nervous' ? (
              <div
                style={{
                  width: s * 0.16,
                  height: s * 0.07,
                  borderTop: '2.5px solid #062A4C',
                  borderLeft: '1.5px solid #062A4C',
                  borderRight: '1.5px solid #062A4C',
                  borderRadius: `${s * 0.06}px ${s * 0.06}px 0 0`,
                }}
              />
            ) : mood === 'surprised' ? (
              <div
                style={{
                  width: s * 0.12,
                  height: s * 0.12,
                  borderRadius: '50%',
                  background: '#062A4C',
                  border: '1px solid rgba(221, 253, 255, 0.4)',
                }}
              />
            ) : mood === 'thinking' ? (
              <div
                style={{
                  width: s * 0.14,
                  height: s * 0.05,
                  borderBottom: '2.4px solid #062A4C',
                  borderRadius: `0 0 ${s * 0.06}px 0`,
                }}
              />
            ) : (
              /* happy / encouraging / default smile */
              <div
                style={{
                  width: s * 0.2,
                  height: s * 0.09,
                  borderBottom: '2.6px solid #062A4C',
                  borderRadius: `0 0 ${s * 0.1}px ${s * 0.1}px`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: 8,
            maxWidth: 240,
            padding: '7px 12px',
            borderRadius: 13,
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #c8e0e8',
            boxShadow: '0 8px 18px rgba(18, 74, 110, 0.12)',
            fontSize: 11,
            fontWeight: 750,
            color: '#102F48',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};
