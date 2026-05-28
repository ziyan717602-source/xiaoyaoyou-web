import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  id: number;
  timestamp: number;
  text: string;
  type?: 'info' | 'action' | 'system' | 'error';
}

interface EventLogProps {
  entries: LogEntry[];
  maxEntries?: number;
}

const EventLog: React.FC<EventLogProps> = ({ entries, maxEntries = 100 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayed = entries.slice(-maxEntries);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries.length]);

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="event-log">
      <div className="event-log-header">事件日志</div>
      <div className="event-log-content" ref={containerRef}>
        {displayed.length === 0 && (
          <div className="event-log-empty">暂无事件</div>
        )}
        {displayed.map(entry => (
          <div key={entry.id} className={`event-log-entry event-log-${entry.type || 'info'}`}>
            <span className="event-log-time">{formatTime(entry.timestamp)}</span>
            <span className="event-log-text">{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLog;
