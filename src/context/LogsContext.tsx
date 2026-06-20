import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GetLogDto } from '../utils/mockData';
import { getAllLogs, getAllLogsByDate } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';
import { saveData, getAllData, STORES } from '../utils/db';

interface LogsContextType {
  logs: GetLogDto[];
  hasMore: boolean;
  loading: boolean;
  page: number;
  fetchLogs: (reset?: boolean) => Promise<void>;
  fetchLogsByDate: (startDate: string, endDate: string, reset?: boolean) => Promise<void>;
  clearLogs: () => void;
  addLog: (log: any) => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<GetLogDto[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await getAllData(STORES.LOGS);
        if (Array.isArray(cached) && cached.length > 0) {
          // Sort by date descending
          const sorted = [...cached].sort((a, b) => {
             const da = new Date(a.TimeOfAction || a.timeOfAction).getTime();
             const db = new Date(b.TimeOfAction || b.timeOfAction).getTime();
             return db - da;
          });
          setLogs(sorted as GetLogDto[]);
        }
      } catch (err) {
        console.warn('Logs cache search failed:', err);
      }
    };
    loadCached();
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const addLog = useCallback((logData: any) => {
     setLogs(prev => {
        const getPersonDto = logData.getPersonDto ?? logData.GetPersonDto;
        const getPersonDetailsDto = getPersonDto?.getPersonDetailsDto ?? getPersonDto?.GetPersonDetailsDto;
        const getUserDto = getPersonDto?.getUserDto ?? getPersonDto?.GetUserDto;

        const normalizedPersonDetails = getPersonDetailsDto ? {
          Id: getPersonDetailsDto.Id ?? getPersonDetailsDto.id,
          id: getPersonDetailsDto.Id ?? getPersonDetailsDto.id,
          FirstName: getPersonDetailsDto.FirstName ?? getPersonDetailsDto.firstName,
          firstName: getPersonDetailsDto.FirstName ?? getPersonDetailsDto.firstName,
          LastName: getPersonDetailsDto.LastName ?? getPersonDetailsDto.lastName,
          lastName: getPersonDetailsDto.LastName ?? getPersonDetailsDto.lastName,
          ImageUrl: getPersonDetailsDto.ImageUrl ?? getPersonDetailsDto.imageUrl,
          imageUrl: getPersonDetailsDto.ImageUrl ?? getPersonDetailsDto.imageUrl,
          Gender: getPersonDetailsDto.Gender ?? getPersonDetailsDto.gender,
          gender: getPersonDetailsDto.Gender ?? getPersonDetailsDto.gender,
        } : undefined;

        const normalizedUser = getUserDto ? {
          Id: getUserDto.Id ?? getUserDto.id,
          id: getUserDto.Id ?? getUserDto.id,
          UserName: getUserDto.UserName ?? getUserDto.userName,
          userName: getUserDto.UserName ?? getUserDto.userName,
          Role: getUserDto.Role ?? getUserDto.role,
          role: getUserDto.Role ?? getUserDto.role,
          RoleName: getUserDto.RoleName ?? getUserDto.roleName,
          roleName: getUserDto.RoleName ?? getUserDto.roleName,
        } : undefined;

        const normalizedPerson = getPersonDto ? {
          Id: getPersonDto.Id ?? getPersonDto.id,
          id: getPersonDto.Id ?? getPersonDto.id,
          PersonId: getPersonDto.PersonId ?? getPersonDto.personId,
          personId: getPersonDto.PersonId ?? getPersonDto.personId,
          Disabled: getPersonDto.Disabled ?? getPersonDto.disabled,
          disabled: getPersonDto.Disabled ?? getPersonDto.disabled,
          GetPersonDetailsDto: normalizedPersonDetails,
          getPersonDetailsDto: normalizedPersonDetails,
          GetUserDto: normalizedUser,
          getUserDto: normalizedUser,
        } : undefined;

        const newLog = {
           Id: logData.Id ?? logData.id,
           id: logData.Id ?? logData.id,
           PersonId: logData.PersonId ?? logData.personId,
           personId: logData.PersonId ?? logData.personId,
           TimeOfAction: logData.TimeOfAction ?? logData.timeOfAction,
           timeOfAction: logData.TimeOfAction ?? logData.timeOfAction,
           LogDetails: logData.LogDetails ?? logData.logDetails,
           logDetails: logData.LogDetails ?? logData.logDetails,
           ActionType: logData.ActionType ?? logData.actionType,
           actionType: logData.ActionType ?? logData.actionType,
           GetPersonDto: normalizedPerson,
           getPersonDto: normalizedPerson,
        };

        // avoid duplicate
        if (prev.find(l => (l.Id ?? l.id) === (newLog.Id ?? newLog.id))) return prev;
        const next = [newLog as any as GetLogDto, ...prev];
        // Cache new log
        saveData(STORES.LOGS, newLog).catch(e => console.warn('Log cache save failed:', e));
        return next;
     });
  }, []);

  useEffect(() => {
     const handleLogCreated = (logData: any) => {
        addLog(logData);
     };

     homeSecurityHubConnection.on("LogCreated", handleLogCreated);

     return () => {
        homeSecurityHubConnection.off("LogCreated", handleLogCreated);
     };
  }, [addLog]);

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
          const next = [...base, ...filteredNewBatch];
          // Cache batch
          Promise.all(filteredNewBatch.map(l => saveData(STORES.LOGS, l))).catch(e => console.warn('Logs batch cache failed:', e));
          return next;
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
    <LogsContext.Provider value={{ logs, hasMore, loading, page, fetchLogs, fetchLogsByDate, clearLogs, addLog }}>
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
