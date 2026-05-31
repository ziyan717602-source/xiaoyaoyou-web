/**
 * SkillPanel - Displays hero skills and bless skills as clickable buttons.
 *
 * Translation of C# PSDClientAo JoyStick skill buttons:
 * - 7 Skill slots (hero's own skills, LightSeaGreen)
 * - 6 ExtSkill slots (Bless skills from others, DodgerBlue)
 *
 * Each button shows the skill name, has enabled/disabled state,
 * and fires the skill code as input when clicked.
 */
import React, { useState } from 'react';

interface SkillPanelProps {
  /** Skill codes for this player's hero skills */
  skills: string[];
  /** Bless/BK skill codes from other players */
  blesses: string[];
  /** Name lookup for skill display names */
  nameLookup?: Record<string, string>;
  /** Called when a skill button is clicked */
  onSkillClick: (code: string) => void;
  /** Whether skill buttons are enabled (false during opponent's turn) */
  enabled?: boolean;
}

const SkillPanel: React.FC<SkillPanelProps> = ({
  skills,
  blesses,
  nameLookup = {},
  onSkillClick,
  enabled = true,
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  if (skills.length === 0 && blesses.length === 0) return null;

  return (
    <div className="skill-panel">
      {/* Hero skills */}
      {skills.length > 0 && (
        <div className="skill-group">
          <span className="skill-group-label">技能</span>
          <div className="skill-buttons">
            {skills.map((code) => {
              const name = nameLookup[code] || code;
              return (
                <button
                  key={code}
                  className={`skill-btn skill-btn-hero ${!enabled ? 'skill-btn-disabled' : ''}`}
                  onClick={() => enabled && onSkillClick(code)}
                  onMouseEnter={() => setHoveredSkill(code)}
                  onMouseLeave={() => setHoveredSkill(null)}
                  title={name}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bless skills */}
      {blesses.length > 0 && (
        <div className="skill-group">
          <span className="skill-group-label">支援</span>
          <div className="skill-buttons">
            {blesses.map((code) => {
              const name = nameLookup[code] || code;
              return (
                <button
                  key={code}
                  className={`skill-btn skill-btn-bless ${!enabled ? 'skill-btn-disabled' : ''}`}
                  onClick={() => enabled && onSkillClick(code)}
                  onMouseEnter={() => setHoveredSkill(code)}
                  onMouseLeave={() => setHoveredSkill(null)}
                  title={name}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Skill tooltip */}
      {hoveredSkill && (
        <div className="skill-tooltip">
          {nameLookup[hoveredSkill] || hoveredSkill}
        </div>
      )}
    </div>
  );
};

export default SkillPanel;
