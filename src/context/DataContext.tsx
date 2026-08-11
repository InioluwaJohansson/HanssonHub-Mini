import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllDoorsByDoorType, getAllCameras, getAllActions } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';
import { saveData, getAllData, STORES } from '../utils/db';

export interface DoorData {
  id: string;
  doorId?: string;
  name: string;
  isLocked: boolean;
  isOpen: boolean;
  doorType?: any;
  type?: string;
}

export interface CameraData {
  id: string;
  name: string;
  imgUrl: string;
  streamUrl?: string;
  cameraId?: string;
  ipAddress?: string;
  username?: string | null;
  streamPath?: string;
  port?: number;
  recordings?: any[];
}

export interface Step {
  id?: number;
  Id?: number;
  stepId?: string;
  StepId?: string;
  stepName?: string;
  StepName?: string;
  stepDescription?: string;
  StepDescription?: string;
  stepActive?: boolean;
  StepActive?: boolean;
}

export interface ActionData {
  id: number;
  Id?: number;
  actionId?: string;
  ActionId?: string;
  actionName?: string;
  ActionName?: string;
  actionDescription?: string;
  ActionDescription?: string;
  actionActive?: boolean;
  ActionActive?: boolean;
  getActionStepDtos?: Step[];
  GetActionStepDtos?: Step[];
}

interface DataContextType {
  doors: DoorData[];
  cameras: CameraData[];
  actions: ActionData[];
  loading: boolean;
  refreshData: () => Promise<void>;
  setDoors: React.Dispatch<React.SetStateAction<DoorData[]>>;
  setCameras: React.Dispatch<React.SetStateAction<CameraData[]>>;
  setActions: React.Dispatch<React.SetStateAction<ActionData[]>>;
}

const getDoorTypeString = (doorType: any) => {
  if (doorType === undefined || doorType === null) return "Main Door";
  const dt = String(doorType).trim();
  if (dt === "3" || dt.toLowerCase() === "maindoor" || dt.toLowerCase() === "main door") return "Main Door";
  if (dt === "2" || dt.toLowerCase() === "garagedoor" || dt.toLowerCase() === "garage door") return "Garage Door";
  if (dt === "1" || dt.toLowerCase() === "backdoor" || dt.toLowerCase() === "back door") return "Back Door";
  if (dt === "4" || dt.toLowerCase() === "gate") return "Gate";
  return `Type ${dt}`;
};

const isMatchingDoor = (d: any) => {
  if (!d) return false;
  const dt = d.doorType ?? d.DoorType ?? d.doorTypeId ?? d.DoorTypeId;
  if (dt !== undefined && dt !== null) {
    const dtStr = String(dt).trim().toLowerCase();
    if (dtStr === '3' || dtStr === '4' || dtStr === 'gate' || dtStr === 'maindoor' || dtStr === 'main door') {
      return true;
    }
  }
  const typeStr = String(d.type ?? d.Type ?? d.doorTypeName ?? d.DoorTypeName ?? '').trim().toLowerCase();
  if (typeStr === 'gate' || typeStr === 'main door' || typeStr === 'maindoor') {
    return true;
  }
  const nameStr = String(d.doorName ?? d.DoorName ?? d.name ?? d.Name ?? '').trim().toLowerCase();
  if (nameStr.includes('gate') || nameStr.includes('main door') || nameStr.includes('maindoor')) {
    return true;
  }
  return false;
};

const buildFullUrl = (url: string | undefined | null) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const baseUrl = "https://kv5zhpcr-7190.uks1.devtunnels.ms/storage/";
  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed.substring(1)}`;
  }
  return `${baseUrl}${trimmed}`;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doors, setDoors] = useState<DoorData[]>([]);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [actions, setActions] = useState<ActionData[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  // Sync state to window level for any legacy components reading there
  useEffect(() => {
    (window as any).__cachedDoors = doors;
  }, [doors]);

  useEffect(() => {
    (window as any).__cachedCameras = cameras;
  }, [cameras]);

  useEffect(() => {
    (window as any).__cachedActions = actions;
  }, [actions]);

  const refreshData = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!localStorage.getItem('auth_token')) {
      setLoading(false);
      return;
    }
    isFetchingRef.current = true;
    
    try {
      const [doorsRes, camerasRes, actionsRes] = await Promise.all([
        getAllDoorsByDoorType(3),
        getAllCameras(),
        getAllActions()
      ]);

      // Parse doors
      const doorsData = (doorsRes?.data ?? doorsRes?.Data ?? doorsRes ?? []).filter((d: any) => isMatchingDoor(d));
      const mappedDoors = doorsData.map((d: any, index: number) => ({
        id: String(d.id ?? d.Id ?? index),
        doorId: String(d.doorId ?? d.DoorId ?? ''),
        name: d.doorName ?? d.DoorName ?? d.name ?? d.Name ?? `Door ${d.id ?? d.Id ?? index}`,
        isLocked: d.isLocked ?? d.IsLocked ?? true,
        isOpen: d.isOpen ?? d.IsOpen ?? false,
        doorType: d.doorType ?? d.DoorType,
        type: d.type ?? d.Type ?? getDoorTypeString(d.doorType ?? d.DoorType)
      }));
      setDoors(mappedDoors);

      // Parse cameras
      const camerasData = camerasRes?.data ?? camerasRes?.Data ?? camerasRes ?? [];
      const mappedCameras = camerasData.map((c: any, index: number) => {
        const rawStream = c.liveStreamUrl ?? c.LiveStreamUrl ?? c.hlsUrl ?? c.HlsUrl ?? c.streamUrl ?? c.StreamUrl ?? c.videoUrl ?? c.VideoUrl ?? c.imgUrl ?? c.ImgUrl;
        return {
          id: String(c.id ?? c.Id ?? index),
          name: c.cameraName ?? c.CameraName ?? c.name ?? c.Name ?? `Camera ${c.id ?? c.Id ?? index}`,
          imgUrl: c.imgUrl ?? c.ImgUrl ?? c.imageUrl ?? c.ImageUrl ?? 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1470&auto=format&fit=crop',
          streamUrl: buildFullUrl(rawStream),
          cameraId: c.cameraId ?? c.CameraId ?? '',
          ipAddress: c.ipAddress ?? c.IpAddress ?? '',
          username: c.username ?? c.Username ?? null,
          streamPath: c.streamPath ?? c.StreamPath ?? '',
          port: c.port ?? c.Port ?? 0,
          recordings: c.recordings ?? c.Recordings ?? []
        };
      });
      setCameras(mappedCameras);
      Promise.all(mappedCameras.map((cam: CameraData) => saveData(STORES.CAMERAS, cam))).catch(e => console.warn('Cam cache save failed:', e));

      // Parse actions
      const actionsData = actionsRes?.data ?? actionsRes?.Data ?? actionsRes?.result ?? actionsRes?.Result ?? actionsRes ?? [];
      setActions(Array.isArray(actionsData) ? actionsData : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        console.warn('DataProvider authorization pending or token invalid (401)');
      } else {
        console.warn('Failed to load data in DataProvider:', err);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const loadCachedAndFetch = async () => {
      // First load from IndexedDB
      try {
        const cached = await getAllData(STORES.CAMERAS);
        if (Array.isArray(cached) && cached.length > 0) {
          setCameras(cached as CameraData[]);
        }
      } catch (err) {
        console.warn('Cameras IndexedDB cache load failed:', err);
      }
      
      // Perform fresh fetch
      await refreshData();
    };

    loadCachedAndFetch();
  }, [refreshData]);

  // Set up global SignalR subscriptions
  useEffect(() => {
    const handleDoorCreated = (data: any) => {
       if (!isMatchingDoor(data)) return;
       setDoors(prev => {
          const doorIdVal = String(data.doorId ?? data.DoorId ?? '');
          const idVal = String(data.id ?? data.Id);
          const nameVal = data.doorName ?? data.DoorName ?? data.name ?? data.Name ?? `Door ${idVal}`;
          const isLockedVal = data.isLocked ?? data.IsLocked ?? true;
          const isOpenVal = data.isOpen ?? data.IsOpen ?? false;
          const dtVal = data.doorType ?? data.DoorType;
          
          const newDoor: DoorData = { 
             id: idVal, 
             doorId: doorIdVal,
             name: nameVal, 
             isLocked: isLockedVal, 
             isOpen: isOpenVal,
             doorType: dtVal,
             type: data.type ?? data.Type ?? getDoorTypeString(dtVal)
          };
          if (prev.find(d => d.id === newDoor.id || (d.doorId && d.doorId === newDoor.id))) return prev;
          return [newDoor, ...prev];
       });
    };

    const handleDoorUpdated = (data: any) => {
       if (!isMatchingDoor(data)) {
         const targetId = String(data.id ?? data.Id);
         setDoors(prev => prev.filter(d => String(d.id) !== targetId && (!d.doorId || String(d.doorId) !== targetId)));
         return;
       }
       setDoors(prev => prev.map(d => {
         const targetId = String(data.id ?? data.Id);
         if (String(d.id) === targetId || (d.doorId && String(d.doorId) === targetId)) {
           const dtVal = data.doorType ?? data.DoorType ?? d.doorType;
           return { 
              ...d, 
              name: data.doorName ?? data.DoorName ?? data.name ?? data.Name ?? d.name, 
              isLocked: data.isLocked ?? data.IsLocked ?? d.isLocked, 
              isOpen: data.isOpen ?? data.IsOpen ?? d.isOpen,
              doorType: dtVal,
              type: data.type ?? data.Type ?? getDoorTypeString(dtVal)
           };
         }
         return d;
       }));
    };

    const handleDoorTriggered = (data: any) => {
       if (!isMatchingDoor(data)) return;
       const triggeredId = String(data.id ?? data.Id);
       setDoors(prev => prev.map(d => {
         if (String(d.id) === triggeredId || (d.doorId && String(d.doorId) === triggeredId)) {
           return {
             ...d,
             isLocked: data.isLocked ?? data.IsLocked ?? d.isLocked,
             isOpen: data.isOpen ?? data.IsOpen ?? d.isOpen
           };
         }
         return d;
       }));
    };

    const handleDoorDeleted = (data: any) => {
       const deletedId = String(data.id ?? data.Id);
       const deletedDoorId = String(data.doorId ?? data.DoorId ?? '');
       setDoors(prev => prev.filter(d => 
         String(d.id) !== deletedId && 
         (!d.doorId || String(d.doorId) !== deletedId) &&
         (!deletedDoorId || (String(d.id) !== deletedDoorId && String(d.doorId) !== deletedDoorId))
       ));
    };

    const handleCameraCreated = (data: any) => {
       setCameras(prev => {
          const rawStream = data.liveStreamUrl ?? data.LiveStreamUrl;
          const newCam: CameraData = {
            id: String(data.id ?? data.Id),
            name: data.cameraName ?? data.CameraName ?? data.name ?? data.Name ?? `Camera ${data.id ?? data.Id}`,
            imgUrl: data.liveStreamUrl ?? data.LiveStreamUrl ?? 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1470&auto=format&fit=crop',
            streamUrl: buildFullUrl(rawStream),
            cameraId: data.cameraId ?? data.CameraId ?? '',
            ipAddress: data.ipAddress ?? data.IpAddress ?? '',
            username: data.username ?? data.Username ?? null,
            streamPath: data.streamPath ?? data.StreamPath ?? '',
            port: data.port ?? data.Port ?? 0,
            recordings: data.recordings ?? data.Recordings ?? []
          };
          if (prev.find(c => c.id === newCam.id)) return prev;
          return [newCam, ...prev];
       });
    };

    const handleCameraUpdated = (data: any) => {
       setCameras(prev => prev.map(c => {
         if (String(c.id) === String(data.id ?? data.Id)) {
           const rawStream = data.liveStreamUrl ?? data.LiveStreamUrl ?? c.streamUrl;
           return {
             ...c,
             name: data.cameraName ?? data.CameraName ?? data.name ?? data.Name ?? c.name,
             imgUrl: data.liveStreamUrl ?? data.LiveStreamUrl ?? c.imgUrl,
             streamUrl: buildFullUrl(rawStream),
             cameraId: data.cameraId ?? data.CameraId ?? c.cameraId,
             ipAddress: data.ipAddress ?? data.IpAddress ?? c.ipAddress,
             username: data.username ?? data.Username ?? c.username,
             streamPath: data.streamPath ?? data.StreamPath ?? c.streamPath,
             port: data.port ?? data.Port ?? c.port,
             recordings: data.recordings ?? data.Recordings ?? c.recordings
           };
         }
         return c;
       }));
    };

    const handleCameraDeleted = (data: any) => {
       setCameras(prev => prev.filter(c => String(c.id) !== String(data.id ?? data.Id)));
    };

    const handleNewRecording = (data: any) => {
       if (!data) return;
       const targetCameraId = data.cameraId ?? data.CameraId;
       if (!targetCameraId) return;

       setCameras(prev => {
         return prev.map(c => {
           const matchByCameraId = c.cameraId && String(c.cameraId).toLowerCase() === String(targetCameraId).toLowerCase();
           const matchById = String(c.id) === String(targetCameraId);
           
           if (matchByCameraId || matchById) {
             const existingRecordings = c.recordings ?? [];
             const filePath = data.filePath ?? data.FilePath;
             const fileName = data.fileName ?? data.FileName;
             
             const alreadyExists = existingRecordings.some((r: any) => {
               const rPath = r.filePath ?? r.FilePath ?? r.recordingPath ?? r.RecordingPath ?? '';
               const rName = r.fileName ?? r.FileName ?? '';
               return (filePath && rPath === filePath) || (fileName && rName === fileName);
             });
             
             if (alreadyExists) return c;

             const updatedCam = {
               ...c,
               recordings: [data, ...existingRecordings]
             };
             saveData(STORES.CAMERAS, updatedCam).catch(e => console.warn('Cache update on new recording failed:', e));
             return updatedCam;
           }
           return c;
         });
       });
    };

    const handleActionCreated = () => {
       getAllActions().then(res => {
         const dataArray = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? res ?? [];
         setActions(Array.isArray(dataArray) ? dataArray : []);
       });
    };

    const handleActionUpdated = () => {
       getAllActions().then(res => {
         const dataArray = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? res ?? [];
         setActions(Array.isArray(dataArray) ? dataArray : []);
       });
    };

    const handleActionActivationChanged = (data: any) => {
      const actId = Number(data?.actionId ?? data?.ActionId);
      const isActive = data?.isActive ?? data?.IsActive ?? data?.actionActive ?? data?.ActionActive ?? false;
      setActions(prev => prev.map(act => {
        const currId = act.id ?? act.Id;
        if (Number(currId) === actId) {
          return {
            ...act,
            actionActive: isActive,
            ActionActive: isActive
          };
        }
        return act;
      }));
    };

    const handleActionDeleted = (data: any) => {
      const actId = Number(data?.actionId ?? data?.ActionId);
      setActions(prev => prev.filter(act => Number(act.id ?? act.Id) !== actId));
    };

    const handleActionTriggered = (data: any) => {
      const actId = Number(data?.actionId ?? data?.ActionId);
      if (isNaN(actId)) return;
      const isActive = data?.isActive ?? data?.IsActive ?? data?.actionActive ?? data?.ActionActive ?? false;
      setActions(prev => prev.map(act => {
        const currId = act.id ?? act.Id;
        if (Number(currId) === actId) {
          return {
            ...act,
            actionActive: isActive,
            ActionActive: isActive
          };
        }
        return act;
      }));
    };

    homeSecurityHubConnection.on("DoorCreated", handleDoorCreated);
    homeSecurityHubConnection.on("DoorUpdated", handleDoorUpdated);
    homeSecurityHubConnection.on("DoorTriggered", handleDoorTriggered);
    homeSecurityHubConnection.on("DoorDeleted", handleDoorDeleted);
    homeSecurityHubConnection.on("CameraCreated", handleCameraCreated);
    homeSecurityHubConnection.on("CameraUpdated", handleCameraUpdated);
    homeSecurityHubConnection.on("CameraDeleted", handleCameraDeleted);
    homeSecurityHubConnection.on("NewRecording", handleNewRecording);
    homeSecurityHubConnection.on("ActionCreated", handleActionCreated);
    homeSecurityHubConnection.on("ActionUpdated", handleActionUpdated);
    homeSecurityHubConnection.on("ActionActivationChanged", handleActionActivationChanged);
    homeSecurityHubConnection.on("ActionDeleted", handleActionDeleted);
    homeSecurityHubConnection.on("ActionTriggered", handleActionTriggered);

    return () => {
      homeSecurityHubConnection.off("DoorCreated", handleDoorCreated);
      homeSecurityHubConnection.off("DoorUpdated", handleDoorUpdated);
      homeSecurityHubConnection.off("DoorTriggered", handleDoorTriggered);
      homeSecurityHubConnection.off("DoorDeleted", handleDoorDeleted);
      homeSecurityHubConnection.off("CameraCreated", handleCameraCreated);
      homeSecurityHubConnection.off("CameraUpdated", handleCameraUpdated);
      homeSecurityHubConnection.off("CameraDeleted", handleCameraDeleted);
      homeSecurityHubConnection.off("NewRecording", handleNewRecording);
      homeSecurityHubConnection.off("ActionCreated", handleActionCreated);
      homeSecurityHubConnection.off("ActionUpdated", handleActionUpdated);
      homeSecurityHubConnection.off("ActionActivationChanged", handleActionActivationChanged);
      homeSecurityHubConnection.off("ActionDeleted", handleActionDeleted);
      homeSecurityHubConnection.off("ActionTriggered", handleActionTriggered);
    };
  }, []);

  return (
    <DataContext.Provider value={{ doors, cameras, actions, loading, refreshData, setDoors, setCameras, setActions }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
