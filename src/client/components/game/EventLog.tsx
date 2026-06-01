import React, { useEffect, useRef, useState, useMemo } from 'react';

export interface LogEntry {
  id: number;
  timestamp: number;
  text: string;
  type?: 'info' | 'action' | 'system' | 'error';
}

type LogFilter = 'all' | 'action' | 'system' | 'info' | 'error';

interface EventLogProps {
  entries: LogEntry[];
  maxEntries?: number;
  onExport?: () => void;
}

const FILTER_LABELS: Record<LogFilter, string> = {
  all: '全部',
  action: '操作',
  system: '系统',
  info: '信息',
  error: '错误',
};

const EventLog: React.FC<EventLogProps> = ({ entries, maxEntries = 500, onExport }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const filtered = useMemo(() => {
    const base = entries.slice(-maxEntries);
    if (filter === 'all') return base;
    return base.filter(e => e.type === filter);
  }, [entries, maxEntries, filter]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(isAtBottom);
  }, []);

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="event-log">
      <div className="event-log-header">
        <span>事件日志 ({filtered.length})</span>
        <div className="event-log-controls">
          <div className="event-log-filters">
            {(Object.keys(FILTER_LABELS) as LogFilter[]).map(f => (
              <button
                key={f}
                className={`event-log-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          {onExport && (
            <button className="event-log-export" onClick={onExport} title="导出日志到文件">
              导出
            </button>
          )}
        </div>
      </div>
      <div
        className="event-log-content"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {filtered.length === 0 && (
          <div className="event-log-empty">暂无事件</div>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className={`event-log-entry event-log-${entry.type || 'info'}`}>
            <span className="event-log-time">{formatTime(entry.timestamp)}</span>
            <span className="event-log-text">{entry.text}</span>
          </div>
        ))}
      </div>
      {!autoScroll && (
        <button className="event-log-scroll-btn" onClick={() => {
          setAutoScroll(true);
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        }}>
          ↓ 最新
        </button>
      )}
    </div>
  );
};

export default EventLog;
