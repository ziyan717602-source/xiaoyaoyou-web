/**
 * BattleStack - Displays battle participants and pool information
 *
 * Shows the rounder, supporter, hinder, hit status, and both team pools
 * during the ZD battle phase.
 */

import React from 'react';

interface BattleStackProps {
  /** Rounder (attacker) UID */
  rounderUid: number;
  /** Rounder's name */
  rounderName?: string;
  /** Supporter UID (if any) */
  supporterUid?: number;
  /** Supporter's name */
  supporterName?: string;
  /** Whether support attack hit */
  supportSucc?: boolean;
  /** Hinder UID (if any) */
  hinderUid?: number;
  /** Hinder's name */
  hinderName?: string;
  /** Whether hinder attack hit */
  hinderSucc?: boolean;
  /** Rounder team pool value */
  rPool: number;
  /** Opponent team pool value */
  oPool: number;
  /** Rounder team number (1 or 2) */
  rounderTeam: number;
}

const BattleStack: React.FC<BattleStackProps> = ({
  rounderUid,
  rounderName = `P${rounderUid}`,
  supporterUid,
  supporterName = supporterUid ? `P${supporterUid}` : undefined,
  supportSucc = false,
  hinderUid,
  hinderName = hinderUid ? `P${hinderUid}` : undefined,
  hinderSucc = false,
  rPool,
  oPool,
  rounderTeam,
}) => {
  const akaTeam = rounderTeam === 1 ? '仙' : '剑';
  const aoTeam = rounderTeam === 1 ? '剑' : '仙';

  return (
    <div className="battle-stack">
      <div className="battle-participants">
        {/* Rounder (attacker) */}
        <div className="participant rounder">
          <span className="participant-label">触发者</span>
          <span className="participant-name">{rounderName}</span>
        </div>

        {/* Supporter */}
        {supporterUid && (
          <div className={`participant supporter ${supportSucc ? 'hit' : 'miss'}`}>
            <span className="participant-label">支援者</span>
            <span className="participant-name">{supporterName}</span>
            <span className="hit-status">{supportSucc ? '命中' : '未中'}</span>
          </div>
        )}

        {/* Hinder */}
        {hinderUid && (
          <div className={`participant hinder ${hinderSucc ? 'hit' : 'miss'}`}>
            <span className="participant-label">妨碍者</span>
            <span className="participant-name">{hinderName}</span>
            <span className="hit-status">{hinderSucc ? '命中' : '未中'}</span>
          </div>
        )}
      </div>

      {/* Pool values */}
      <div className="battle-pools">
        <div className={`pool pool-r ${rPool > oPool ? 'leading' : ''}`}>
          <span className="pool-team">{akaTeam}方</span>
          <span className="pool-value">{rPool}</span>
        </div>
        <div className="pool-vs">VS</div>
        <div className={`pool pool-o ${oPool > rPool ? 'leading' : ''}`}>
          <span className="pool-team">{aoTeam}方</span>
          <span className="pool-value">{oPool}</span>
        </div>
      </div>
    </div>
  );
};

export default BattleStack;
