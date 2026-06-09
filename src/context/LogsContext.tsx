import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { GetLogDto } from '../utils/mockData';
import { getAllLogs, getAllLogsByDate } from '../utils/api';

interface LogsContextType {
  logs: GetLogDto[];
  hasMore: boolean;
  loading: boolean;
  page: number;
  fetchLogs: (reset?: boolean) => Promise<void>;
  fetchLogsByDate: (startDate: string, endDate: string, reset?: boolean) => Promise<void>;
  clearLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<GetLogDto[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const isLoadingRef = useRef(false);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const fetchLogs = useCallback(async (reset = false) => {
    if (isLoadingRef.current || (!hasMore && !reset)) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    const currentPage = reset ? 1 : page;
    
    try {
      const res = await getAllLogs(currentPage, 50);
      if (res.status && res.data) {
        setLogs(prev => {
          const base = reset ? [] : prev;
          const currentIds = new Set(base.map(l => l.Id ?? l.id));
          const newBatch: GetLogDto[] = res.data;
          const filteredNewBatch = newBatch.filter(l => !currentIds.has(l.Id ?? l.id));
          return [...base, ...filteredNewBatch];
        });
        setPage(currentPage + 1);
        if (res.data.length < 50) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
      setHasMore(false);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [page, hasMore]);

  const fetchLogsByDate = useCallback(async (startDate: string, endDate: string, reset = true) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    const currentPage = reset ? 1 : page;
    
    try {
      const res = await getAllLogsByDate(startDate, endDate, currentPage, 50);
      if (res.status && res.data) {
        setLogs(prev => {
          const base = reset ? [] : prev;
          const currentIds = new Set(base.map(l => l.Id ?? l.id));
          const newBatch: GetLogDto[] = res.data;
          const filteredNewBatch = newBatch.filter(l => !currentIds.has(l.Id ?? l.id));
          return [...base, ...filteredNewBatch];
        });
        setPage(currentPage + 1);
        setHasMore(res.data.length === 50);
      } else {
        setHasMore(false);
        if (reset) setLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch logs by date', err);
      setHasMore(false);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [page]);

  return (
    <LogsContext.Provider value={{ logs, hasMore, loading, page, fetchLogs, fetchLogsByDate, clearLogs }}>
      {children}
    </LogsContext.Provider>
  );
};

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
};
