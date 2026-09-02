import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllDoorsByDoorType, getAllCameras, getAllActions, getAllExternals } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';
import { saveData, getAllData, STORES } from '../utils/db';
import { triggerAppNotification } from '../utils/notifications';

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
  isActive?: boolean;
  IsActive?: boolean;
  getActionStepDtos?: Step[];
  GetActionStepDtos?: Step[];
}

export function parseActionSignalRPayload(...args: any[]): {
  actionId: number | null;
  isActive?: boolean;
  actionName?: string;
  actionDescription?: string;
  raw?: any;
} {
  if (!args || args.length === 0) {
    return { actionId: null };
  }

  let actionId: number | null = null;
  let isActive: boolean | undefined = undefined;
  let actionName: string | undefined = undefined;
  let actionDescription: string | undefined = undefined;

  const arg0 = args[0];
  const arg1 = args[1];
  const arg2 = args[2];

  // 1. Check if first argument is a numeric ID
  if (typeof arg0 === 'number') {
    actionId = arg0;
  } else if (typeof arg0 === 'string' && /^\d+$/.test(arg0.trim())) {
    actionId = Number(arg0.trim());
  }

  // 2. Check if second argument is a boolean state (e.g. SignalR hub SendAsync("ActionActivationChanged", id, isActive))
  if (typeof arg1 === 'boolean') {
    isActive = arg1;
  } else if (typeof arg1 === 'string' && (arg1.toLowerCase() === 'true' || arg1.toLowerCase() === 'false')) {
    isActive = arg1.toLowerCase() === 'true';
  } else if (typeof arg1 === 'number' && (arg1 === 0 || arg1 === 1)) {
    isActive = arg1 === 1;
  }

  // 3. Check if third or second argument is an action name
  if (typeof arg2 === 'string' && arg2.trim() !== '') {
    actionName = arg2.trim();
  } else if (typeof arg1 === 'string' && arg1.toLowerCase() !== 'true' && arg1.toLowerCase() !== 'false' && isNaN(Number(arg1))) {
    actionName = arg1.trim();
  }

  // 4. Helper to inspect object payloads
  const inspectObj = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    // Check nested wrappers like { data: { ... } } or { result: { ... } }
    const target = (obj.data !== undefined && typeof obj.data === 'object' && obj.data !== null)
      ? obj.data
      : ((obj.result !== undefined && typeof obj.result === 'object' && obj.result !== null) ? obj.result : obj);

    if (actionId === null) {
      const rawId = target.id ?? target.Id ?? target.actionId ?? target.ActionId ?? obj.id ?? obj.Id ?? obj.actionId ?? obj.ActionId;
      if (rawId !== undefined && !isNaN(Number(rawId)) && Number(rawId) > 0) {
        actionId = Number(rawId);
      }
    }

    if (isActive === undefined) {
      if (typeof target.actionActive === 'boolean') isActive = target.actionActive;
      else if (typeof target.ActionActive === 'boolean') isActive = target.ActionActive;
      else if (typeof target.isActive === 'boolean') isActive = target.isActive;
      else if (typeof target.IsActive === 'boolean') isActive = target.IsActive;
      else if (typeof target.active === 'boolean') isActive = target.active;
      else if (typeof target.Active === 'boolean') isActive = target.Active;
      else if (typeof obj.actionActive === 'boolean') isActive = obj.actionActive;
      else if (typeof obj.ActionActive === 'boolean') isActive = obj.ActionActive;
      else if (typeof obj.isActive === 'boolean') isActive = obj.isActive;
      else if (typeof obj.IsActive === 'boolean') isActive = obj.IsActive;
      else if (typeof obj.result === 'boolean') isActive = obj.result;
      else if (typeof obj.Result === 'boolean') isActive = obj.Result;
      else if (typeof obj.data === 'boolean') isActive = obj.data;
      else if (typeof obj.Data === 'boolean') isActive = obj.Data;
    }

    if (!actionName) {
      actionName = target.actionName ?? target.ActionName ?? target.name ?? target.Name ?? obj.actionName ?? obj.ActionName;
    }

    if (!actionDescription) {
      actionDescription = target.actionDescription ?? target.ActionDescription ?? target.description ?? target.Description ?? obj.actionDescription ?? obj.ActionDescription;
    }
  };

  inspectObj(arg0);
  inspectObj(arg1);

  // If arg0 itself was a boolean (e.g. function called with boolean)
  if (typeof arg0 === 'boolean' && isActive === undefined) {
    isActive = arg0;
  }

  return {
    actionId: actionId !== null && !isNaN(actionId) && actionId > 0 ? actionId : null,
    isActive,
    actionName,
    actionDescription,
    raw: arg0
  };
}

export interface ExternalData {
  id: number;
  Id?: number;
  externalName: string;
  ExternalName?: string;
  externalId?: string;
  ExternalId?: string;
  isTriggered: boolean;
  IsTriggered?: boolean;
  actionIds?: number[];
  ActionIds?: number[];
  isActive: boolean;
  IsActive?: boolean;
  powerActive?: boolean;
  PowerActive?: boolean;
  roomId?: number | null;
  RoomId?: number | null;
  roomName?: string | null;
  RoomName?: string | null;
  sectionId?: number | null;
  SectionId?: number | null;
  sectionName?: string | null;
  SectionName?: string | null;
  createdBy?: number;
  CreatedBy?: number;
  createdByName?: string;
  CreatedByName?: string;
  createdOn?: string;
  CreatedOn?: string;
  lastModifiedBy?: number;
  LastModifiedBy?: number;
  lastModifiedByName?: string;
  LastModifiedByName?: string;
  lastModifiedOn?: string | null;
  LastModifiedOn?: string | null;
  isDeleted?: boolean;
  IsDeleted?: boolean;
  personId?: number;
  PersonId?: number;
  peronName?: string;
  PeronName?: string;
  isHidden?: boolean;
  IsHidden?: boolean;
}

interface DataContextType {
  doors: DoorData[];
  cameras: CameraData[];
  actions: ActionData[];
  externals: ExternalData[];
  loading: boolean;
  refreshData: () => Promise<void>;
  setDoors: React.Dispatch<React.SetStateAction<DoorData[]>>;
  setCameras: React.Dispatch<React.SetStateAction<CameraData[]>>;
  setActions: React.Dispatch<React.SetStateAction<ActionData[]>>;
  setExternals: React.Dispatch<React.SetStateAction<ExternalData[]>>;
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
  const [externals, setExternals] = useState<ExternalData[]>([]);
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

  useEffect(() => {
    (window as any).__cachedExternals = externals;
  }, [externals]);

  const refreshData = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!localStorage.getItem('auth_token')) {
      setLoading(false);
      return;
    }
    isFetchingRef.current = true;
    
    try {
      const [doorsRes, camerasRes, actionsRes, externalsRes] = await Promise.all([
        getAllDoorsByDoorType(3),
        getAllCameras(),
        getAllActions(),
        getAllExternals().catch(e => {
          console.warn('Failed to load externals:', e);
          return { data: [] };
        })
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

      // Parse externals
      const rawExts = externalsRes?.data ?? externalsRes?.Data ?? externalsRes?.result ?? externalsRes?.Result ?? (Array.isArray(externalsRes) ? externalsRes : []);
      if (Array.isArray(rawExts)) {
        const mappedExts: ExternalData[] = rawExts.map((ext: any, index: number) => ({
          id: Number(ext.id ?? ext.Id ?? index + 1),
          externalName: ext.externalName ?? ext.ExternalName ?? `External ${ext.id ?? ext.Id ?? index + 1}`,
          externalId: ext.externalId ?? ext.ExternalId ?? '',
          isTriggered: ext.isTriggered ?? ext.IsTriggered ?? false,
          actionIds: ext.actionIds ?? ext.ActionIds ?? [],
          isActive: ext.isActive ?? ext.IsActive ?? false,
          powerActive: ext.powerActive ?? ext.PowerActive ?? false,
          roomId: ext.roomId ?? ext.RoomId ?? null,
          roomName: ext.roomName ?? ext.RoomName ?? null,
          sectionId: ext.sectionId ?? ext.SectionId ?? null,
          sectionName: ext.sectionName ?? ext.SectionName ?? null,
          createdBy: ext.createdBy ?? ext.CreatedBy,
          createdByName: ext.createdByName ?? ext.CreatedByName,
          createdOn: ext.createdOn ?? ext.CreatedOn,
          lastModifiedBy: ext.lastModifiedBy ?? ext.LastModifiedBy,
          lastModifiedByName: ext.lastModifiedByName ?? ext.LastModifiedByName,
          lastModifiedOn: ext.lastModifiedOn ?? ext.LastModifiedOn,
          isDeleted: ext.isDeleted ?? ext.IsDeleted ?? false,
          isHidden: ext.isHidden ?? ext.IsHidden ?? false,
          personId: ext.personId ?? ext.PersonId,
          peronName: ext.peronName ?? ext.PeronName
        }));
        setExternals(mappedExts);
      }
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

       const doorName = data.doorName ?? data.DoorName ?? data.name ?? data.Name ?? `Door #${data.id ?? data.Id}`;
       const isLocked = data.isLocked ?? data.IsLocked;
       const isOpen = data.isOpen ?? data.IsOpen;

       if (isLocked !== undefined) {
         triggerAppNotification({
           title: doorName,
           message: isLocked ? 'Door Secured & Locked' : 'Door Unlocked',
           type: 'door',
           status: isLocked ? 'locked' : 'unlocked',
           badge: 'Door'
         });
       } else if (isOpen !== undefined) {
         triggerAppNotification({
           title: doorName,
           message: isOpen ? 'Door Opened' : 'Door Closed',
           type: 'door',
           status: isOpen ? 'open' : 'closed',
           badge: 'Door'
         });
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
       const doorName = data.doorName ?? data.DoorName ?? data.name ?? data.Name ?? `Door #${triggeredId}`;
       const isLocked = data.isLocked ?? data.IsLocked;
       const isOpen = data.isOpen ?? data.IsOpen;

       if (isLocked !== undefined) {
         triggerAppNotification({
           title: doorName,
           message: isLocked ? 'Door Secured & Locked' : 'Door Unlocked',
           type: 'door',
           status: isLocked ? 'locked' : 'unlocked',
           badge: 'Door'
         });
       } else if (isOpen !== undefined) {
         triggerAppNotification({
           title: doorName,
           message: isOpen ? 'Door Opened' : 'Door Closed',
           type: 'door',
           status: isOpen ? 'open' : 'closed',
           badge: 'Door'
         });
       }

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

    const handleActionCreated = (...args: any[]) => {
      console.log('[SignalR ActionCreated received]:', args);
      getAllActions().then(res => {
        const dataArray = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? res ?? [];
        setActions(Array.isArray(dataArray) ? dataArray : []);
      }).catch(e => console.warn('SignalR handleActionCreated error:', e));
    };

    const handleActionUpdated = (...args: any[]) => {
      console.log('[SignalR ActionUpdated received]:', args);
      const parsed = parseActionSignalRPayload(...args);
      console.log('[SignalR ActionUpdated parsed]:', parsed);

      if (parsed.actionId) {
        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === parsed.actionId) {
            return {
              ...act,
              ...(parsed.isActive !== undefined ? {
                actionActive: parsed.isActive,
                ActionActive: parsed.isActive,
                isActive: parsed.isActive,
                IsActive: parsed.isActive
              } : {}),
              actionName: parsed.actionName ?? act.actionName ?? act.ActionName,
              ActionName: parsed.actionName ?? act.ActionName ?? act.actionName,
              actionDescription: parsed.actionDescription ?? act.actionDescription ?? act.ActionDescription,
              ActionDescription: parsed.actionDescription ?? act.ActionDescription ?? act.actionDescription
            };
          }
          return act;
        }));
      }

      getAllActions().then(res => {
        const dataArray = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? res ?? [];
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          setActions(dataArray);
        }
      }).catch(e => console.warn('SignalR handleActionUpdated fetch error:', e));
    };

    const handleActionActivationChanged = (...args: any[]) => {
      console.log('[SignalR ActionActivationChanged received]:', args);
      const parsed = parseActionSignalRPayload(...args);
      console.log('[SignalR ActionActivationChanged parsed]:', parsed);

      if (parsed.actionId && parsed.isActive !== undefined) {
        const targetId = parsed.actionId;
        const targetActive = parsed.isActive;
        const actName = parsed.actionName || `Action #${targetId}`;

        triggerAppNotification({
          title: actName,
          message: targetActive ? 'Security action routine enabled' : 'Security action routine disabled',
          type: 'action',
          status: targetActive ? 'active' : 'inactive',
          badge: 'Action'
        });

        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === targetId) {
            return {
              ...act,
              actionActive: targetActive,
              ActionActive: targetActive,
              isActive: targetActive,
              IsActive: targetActive,
              ...(parsed.actionName ? { actionName: parsed.actionName, ActionName: parsed.actionName } : {})
            };
          }
          return act;
        }));
      }
    };

    const handleActionDeleted = (...args: any[]) => {
      const parsed = parseActionSignalRPayload(...args);
      const actId = parsed.actionId;
      if (actId) {
        setActions(prev => prev.filter(act => Number(act.id ?? act.Id) !== actId));
      }
    };

    const handleActionTriggered = (...args: any[]) => {
      console.log('[SignalR ActionTriggered received]:', args);
      const parsed = parseActionSignalRPayload(...args);
      const actId = parsed.actionId;

      const actName = parsed.actionName || (actId ? `Action #${actId}` : 'Action Routine');
      triggerAppNotification({
        title: actName,
        message: 'Security action routine initiated',
        type: 'action',
        status: 'triggered',
        badge: 'Action'
      });

      if (actId && parsed.isActive !== undefined) {
        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === actId) {
            return {
              ...act,
              actionActive: parsed.isActive!,
              ActionActive: parsed.isActive!,
              isActive: parsed.isActive!,
              IsActive: parsed.isActive!
            };
          }
          return act;
        }));
      }
    };

    const handleExternalCreated = (data: any) => {
      getAllExternals().then(res => {
        const rawExts = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? (Array.isArray(res) ? res : []);
        if (Array.isArray(rawExts)) {
          setExternals(rawExts.map((ext: any, index: number) => ({
            id: Number(ext.id ?? ext.Id ?? index + 1),
            externalName: ext.externalName ?? ext.ExternalName ?? `External ${ext.id ?? ext.Id ?? index + 1}`,
            externalId: ext.externalId ?? ext.ExternalId ?? '',
            isTriggered: ext.isTriggered ?? ext.IsTriggered ?? false,
            actionIds: ext.actionIds ?? ext.ActionIds ?? [],
            isActive: ext.isActive ?? ext.IsActive ?? false,
            powerActive: ext.powerActive ?? ext.PowerActive ?? false,
            roomId: ext.roomId ?? ext.RoomId ?? null,
            roomName: ext.roomName ?? ext.RoomName ?? null,
            sectionId: ext.sectionId ?? ext.SectionId ?? null,
            sectionName: ext.sectionName ?? ext.SectionName ?? null,
            createdBy: ext.createdBy ?? ext.CreatedBy,
            createdByName: ext.createdByName ?? ext.CreatedByName,
            createdOn: ext.createdOn ?? ext.CreatedOn,
            lastModifiedBy: ext.lastModifiedBy ?? ext.LastModifiedBy,
            lastModifiedByName: ext.lastModifiedByName ?? ext.LastModifiedByName,
            lastModifiedOn: ext.lastModifiedOn ?? ext.LastModifiedOn,
            isDeleted: ext.isDeleted ?? ext.IsDeleted ?? false,
            isHidden: ext.isHidden ?? ext.IsHidden ?? false,
            personId: ext.personId ?? ext.PersonId,
            peronName: ext.peronName ?? ext.PeronName
          })));
        }
      }).catch(err => console.warn('SignalR handleExternalCreated error:', err));
    };

    const handleExternalUpdated = (data: any) => {
      console.log('[SignalR ExternalUpdated/ExternalsUpdated received]:', data);
      if (!data) return;
      const targetId = Number(data.id ?? data.Id ?? data.externalId ?? data.ExternalId);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      const isDeleted = Boolean(data.isDeleted ?? data.IsDeleted ?? false);

      if (isDeleted) {
        setExternals(prev => prev.filter(ext => ext.id !== targetId && (!targetExtId || ext.externalId !== targetExtId)));
        return;
      }

      setExternals(prev => {
        const exists = prev.some(ext => ext.id === targetId || (targetExtId && ext.externalId === targetExtId));
        if (!exists && targetId) {
          return [...prev, {
            id: targetId,
            externalName: data.externalName ?? data.ExternalName ?? `External #${targetId}`,
            externalId: data.externalId ?? data.ExternalId ?? '',
            isTriggered: data.isTriggered !== undefined ? Boolean(data.isTriggered) : (data.IsTriggered !== undefined ? Boolean(data.IsTriggered) : false),
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : (data.IsActive !== undefined ? Boolean(data.IsActive) : false),
            powerActive: data.powerActive !== undefined ? Boolean(data.powerActive) : (data.PowerActive !== undefined ? Boolean(data.PowerActive) : true),
            roomId: data.roomId ?? data.RoomId ?? null,
            sectionId: data.sectionId ?? data.SectionId ?? null,
            roomName: data.roomName ?? data.RoomName ?? null,
            sectionName: data.sectionName ?? data.SectionName ?? null,
            actionIds: data.actionIds ?? data.ActionIds ?? [],
            createdBy: data.createdBy ?? data.CreatedBy,
            createdByName: data.createdByName ?? data.CreatedByName,
            createdOn: data.createdOn ?? data.CreatedOn,
            lastModifiedBy: data.lastModifiedBy ?? data.LastModifiedBy,
            lastModifiedByName: data.lastModifiedByName ?? data.LastModifiedByName,
            lastModifiedOn: data.lastModifiedOn ?? data.LastModifiedOn,
            isDeleted: false,
            isHidden: data.isHidden ?? data.IsHidden ?? false
          }];
        }

        return prev.map(ext => {
          if (ext.id === targetId || (targetExtId && ext.externalId === targetExtId)) {
            return {
              ...ext,
              externalName: data.externalName ?? data.ExternalName ?? ext.externalName,
              externalId: data.externalId ?? data.ExternalId ?? ext.externalId,
              isTriggered: data.isTriggered !== undefined ? Boolean(data.isTriggered) : (data.IsTriggered !== undefined ? Boolean(data.IsTriggered) : ext.isTriggered),
              isActive: data.isActive !== undefined ? Boolean(data.isActive) : (data.IsActive !== undefined ? Boolean(data.IsActive) : ext.isActive),
              powerActive: data.powerActive !== undefined ? Boolean(data.powerActive) : (data.PowerActive !== undefined ? Boolean(data.PowerActive) : ext.powerActive),
              roomId: data.roomId !== undefined ? (data.roomId ?? data.RoomId) : ext.roomId,
              sectionId: data.sectionId !== undefined ? (data.sectionId ?? data.SectionId) : ext.sectionId,
              roomName: data.roomName ?? data.RoomName ?? ext.roomName,
              sectionName: data.sectionName ?? data.SectionName ?? ext.sectionName,
              actionIds: data.actionIds ?? data.ActionIds ?? ext.actionIds,
              createdBy: data.createdBy ?? data.CreatedBy ?? ext.createdBy,
              createdByName: data.createdByName ?? data.CreatedByName ?? ext.createdByName,
              createdOn: data.createdOn ?? data.CreatedOn ?? ext.createdOn,
              lastModifiedBy: data.lastModifiedBy ?? data.LastModifiedBy ?? ext.lastModifiedBy,
              lastModifiedByName: data.lastModifiedByName ?? data.LastModifiedByName ?? ext.lastModifiedByName,
              lastModifiedOn: data.lastModifiedOn ?? data.LastModifiedOn ?? ext.lastModifiedOn,
              isHidden: data.isHidden !== undefined ? Boolean(data.isHidden ?? data.IsHidden) : ext.isHidden
            };
          }
          return ext;
        });
      });

      // Background sync to ensure full relational details like room and section names
      getAllExternals().then(res => {
        const rawExts = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? (Array.isArray(res) ? res : []);
        if (Array.isArray(rawExts) && rawExts.length > 0) {
          setExternals(rawExts.map((ext: any, index: number) => ({
            id: Number(ext.id ?? ext.Id ?? index + 1),
            externalName: ext.externalName ?? ext.ExternalName ?? `External ${ext.id ?? ext.Id ?? index + 1}`,
            externalId: ext.externalId ?? ext.ExternalId ?? '',
            isTriggered: ext.isTriggered ?? ext.IsTriggered ?? false,
            actionIds: ext.actionIds ?? ext.ActionIds ?? [],
            isActive: ext.isActive ?? ext.IsActive ?? false,
            powerActive: ext.powerActive ?? ext.PowerActive ?? false,
            roomId: ext.roomId ?? ext.RoomId ?? null,
            roomName: ext.roomName ?? ext.RoomName ?? null,
            sectionId: ext.sectionId ?? ext.SectionId ?? null,
            sectionName: ext.sectionName ?? ext.SectionName ?? null,
            createdBy: ext.createdBy ?? ext.CreatedBy,
            createdByName: ext.createdByName ?? ext.CreatedByName,
            createdOn: ext.createdOn ?? ext.CreatedOn,
            lastModifiedBy: ext.lastModifiedBy ?? ext.LastModifiedBy,
            lastModifiedByName: ext.lastModifiedByName ?? ext.LastModifiedByName,
            lastModifiedOn: ext.lastModifiedOn ?? ext.LastModifiedOn,
            isDeleted: ext.isDeleted ?? ext.IsDeleted ?? false,
            isHidden: ext.isHidden ?? ext.IsHidden ?? false,
            personId: ext.personId ?? ext.PersonId,
            peronName: ext.peronName ?? ext.PeronName
          })));
        }
      }).catch(err => console.warn('SignalR getAllExternals background fetch error:', err));
    };

    const handleExternalTriggered = (data: any) => {
      if (!data) return;
      const targetId = Number(data.id ?? data.Id);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      const isTrig = data.isTriggered !== undefined ? Boolean(data.isTriggered) : (data.IsTriggered !== undefined ? Boolean(data.IsTriggered) : true);
      const isAct = data.isActive !== undefined ? Boolean(data.isActive) : (data.IsActive !== undefined ? Boolean(data.IsActive) : undefined);
      const extName = data.externalName ?? data.ExternalName ?? (targetExtId || (targetId ? `External #${targetId}` : 'External Sensor'));

      if (isTrig) {
        triggerAppNotification({
          title: extName,
          message: 'External perimeter sensor triggered!',
          type: 'external',
          status: 'triggered',
          badge: 'External'
        });
      }

      setExternals(prev => prev.map(ext => {
        if (ext.id === targetId || (targetExtId && ext.externalId === targetExtId)) {
          return {
            ...ext,
            isTriggered: isTrig,
            isActive: isAct !== undefined ? isAct : ext.isActive
          };
        }
        return ext;
      }));
    };

    const handleExternalActivationChanged = (data: any) => {
      if (!data) return;
      const targetId = Number(data.id ?? data.Id);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      let isActive: boolean | undefined = undefined;
      if (data?.isActive !== undefined) isActive = Boolean(data.isActive);
      else if (data?.IsActive !== undefined) isActive = Boolean(data.IsActive);
      
      let isTriggered: boolean | undefined = undefined;
      if (data?.isTriggered !== undefined) isTriggered = Boolean(data.isTriggered);
      else if (data?.IsTriggered !== undefined) isTriggered = Boolean(data.IsTriggered);

      const extName = data.externalName ?? data.ExternalName ?? (targetExtId || (targetId ? `External #${targetId}` : 'External Device'));

      if (isActive !== undefined) {
        triggerAppNotification({
          title: extName,
          message: isActive ? 'External device enabled' : 'External device disabled',
          type: 'external',
          status: isActive ? 'active' : 'inactive',
          badge: 'External'
        });
      }

      setExternals(prev => prev.map(ext => {
        if (ext.id === targetId || (targetExtId && ext.externalId === targetExtId)) {
          return {
            ...ext,
            isActive: isActive !== undefined ? isActive : ext.isActive,
            isTriggered: isTriggered !== undefined ? isTriggered : ext.isTriggered
          };
        }
        return ext;
      }));
    };

    const handleExternalDeleted = (data: any) => {
      if (!data) return;
      const targetId = Number(data.id ?? data.Id);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      setExternals(prev => prev.filter(ext => ext.id !== targetId && (!targetExtId || ext.externalId !== targetExtId)));
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
    homeSecurityHubConnection.on("ExternalCreated", handleExternalCreated);
    homeSecurityHubConnection.on("ExternalsCreated", handleExternalCreated);
    homeSecurityHubConnection.on("ExternalUpdated", handleExternalUpdated);
    homeSecurityHubConnection.on("ExternalsUpdated", handleExternalUpdated);
    homeSecurityHubConnection.on("ExternalActivationChanged", handleExternalActivationChanged);
    homeSecurityHubConnection.on("ExternalsActivationChanged", handleExternalActivationChanged);
    homeSecurityHubConnection.on("ExternalTriggered", handleExternalTriggered);
    homeSecurityHubConnection.on("ExternalsTriggered", handleExternalTriggered);
    homeSecurityHubConnection.on("ExternalDeleted", handleExternalDeleted);
    homeSecurityHubConnection.on("ExternalsDeleted", handleExternalDeleted);

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
      homeSecurityHubConnection.off("ExternalCreated", handleExternalCreated);
      homeSecurityHubConnection.off("ExternalsCreated", handleExternalCreated);
      homeSecurityHubConnection.off("ExternalUpdated", handleExternalUpdated);
      homeSecurityHubConnection.off("ExternalsUpdated", handleExternalUpdated);
      homeSecurityHubConnection.off("ExternalActivationChanged", handleExternalActivationChanged);
      homeSecurityHubConnection.off("ExternalsActivationChanged", handleExternalActivationChanged);
      homeSecurityHubConnection.off("ExternalTriggered", handleExternalTriggered);
      homeSecurityHubConnection.off("ExternalsTriggered", handleExternalTriggered);
      homeSecurityHubConnection.off("ExternalDeleted", handleExternalDeleted);
      homeSecurityHubConnection.off("ExternalsDeleted", handleExternalDeleted);
    };
  }, []);

  return (
    <DataContext.Provider value={{ doors, cameras, actions, externals, loading, refreshData, setDoors, setCameras, setActions, setExternals }}>
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
