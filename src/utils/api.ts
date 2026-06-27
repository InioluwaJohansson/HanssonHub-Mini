import axios from 'axios';

export const getBaseUrl = (): string => {
  return localStorage.getItem('api_base_url') || 'https://kv5zhpcr-7190.uks1.devtunnels.ms';
};

export const saveBaseUrl = (url: string) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  localStorage.setItem('api_base_url', cleanUrl);
};

export const saveToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

export const getToken = () => {
  const theme = localStorage.getItem('app_theme');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return localStorage.getItem('auth_token');
};

export const saveUserDetails = (details: any) => {
  localStorage.setItem('user_details', JSON.stringify(details));
};

export const getUserDetails = () => {
  const details = localStorage.getItem('user_details');
  return details ? JSON.parse(details) : null;
};

export const getAppNamesIdList = async () => {
  const response = await api.post('/Dashboard/GetAppNamesIdList');
  return response.data;
};

export const saveAppNamesList = (data: any) => {
  if (data && typeof data === 'object') {
    if ('result' in data && data.result) {
      localStorage.setItem('app_names_list', JSON.stringify(data.result));
      return;
    }
    if ('Result' in data && data.Result) {
      localStorage.setItem('app_names_list', JSON.stringify(data.Result));
      return;
    }
  }
  localStorage.setItem('app_names_list', JSON.stringify(data));
};

export const getStoredAppNamesList = () => {
  const data = localStorage.getItem('app_names_list');
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object') {
      if ('result' in parsed && parsed.result) {
        return parsed.result;
      }
      if ('Result' in parsed && parsed.Result) {
        return parsed.Result;
      }
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

const api = axios.create({
  get baseURL() {
    return getBaseUrl() + '/Home_Security';
  }
});

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl() + '/Home_Security';
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['accept'] = '*/*';
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const loginUser = async (userName: string, password: string) => {
  const response = await api.get('/User/Login', {
    params: { userName, password },
  });
  return response.data;
};

export const verifyAuthCode = async (authCode: string) => {
  const response = await api.post(`/User/VerifyAuthCode?authCode=${encodeURIComponent(authCode)}`);
  return response.data;
};

export const refreshToken = async () => {
  const response = await api.post('/User/RefreshToken');
  return response.data;
};

export const getAllLogs = async (page: number = 1, pageSize: number = 50) => {
  const response = await api.post('/Log/GetAllLogs', null, {
    params: { page, pageSize }
  });
  return response.data;
};

export const getAllLogsByDate = async (startDate: string, endDate: string, page: number = 1, pageSize: number = 50) => {
  const response = await api.post('/Log/GetAllLogsByDate', null, {
    params: { startDate, endDate, page, pageSize }
  });
  return response.data;
};

export const getAllDoorsByDoorType = async (doorType: number = 3) => {
  const response = await api.post('/Door/GetAllDoorsByDoorType', null, {
    params: { doorType }
  });
  return response.data;
};

export const getAllCameras = async () => {
  const response = await api.post('/Camera/GetAllCameras');
  return response.data;
};

export const changePassword = async (data: any) => {
  const response = await api.put('/User/ChangePassword', data);
  return response.data;
};

export const changeAuthCode = async (data: any) => {
  const response = await api.put('/User/ChangeAuthorizationCode', data);
  return response.data;
};

export const refreshLoginToken = async () => {
  const response = await api.post('/User/RefreshLoginToken');
  return response.data;
};

export const createDirectChat = async (recipientPersonId: number) => {
  const response = await api.post(`/Chat/CreateChat?recipientPersonId=${recipientPersonId}`);
  return response.data;
};

export const createGroupChat = async (name: string, description: string, participantPersonIds: number[], imageFile: File | null) => {
  const formData = new FormData();
  if (imageFile) {
    formData.append('ImageUrl', imageFile);
  }
  
  const params = new URLSearchParams();
  params.append('Name', name);
  if (description) {
    params.append('Description', description);
  }
  participantPersonIds.forEach(id => {
    params.append('ParticipantPersonIds', id.toString());
  });
  
  const response = await api.post(`/Chat/CreateGroupChat?${params.toString()}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return response.data;
};

export const getChatById = async (id: number) => {
  const response = await api.get(`/Chat/GetChatById?id=${id}`);
  return response.data;
};

export const getMyChats = async () => {
  const response = await api.get('/Chat/GetMyChats');
  return response.data;
};

export const removeParticipant = async (chatId: number, recipientId: number) => {
  const response = await api.put(`/Chat/RemoveParticipant?chatId=${chatId}&recipientId=${recipientId}`);
  return response.data;
};

export const addParticipants = async (chatId: number, personIds: number[]) => {
  const response = await api.post(`/Chat/AddParticipant?chatId=${chatId}`, { personIds });
  return response.data;
};

export const base64ToBlob = (base64Data: string, contentType: string = '') => {
  try {
    const sliceSize = 1024;
    const block = base64Data.split(";");
    const realData = block.length > 1 ? (block[1].includes(",") ? block[1].split(",")[1] : block[1]) : base64Data;
    
    // Ensure realData is a valid base64 (very basic check)
    if (!realData || realData.trim() === "") {
      return new Blob([''], { type: contentType });
    }

    const byteCharacters = atob(realData.replace(/\s/g, ''));
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  } catch (err) {
    console.error("base64ToBlob error:", err);
    return new Blob([''], { type: contentType });
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const sendMessage = async (data: { chatId: number; content?: string; type: number; attachments: any[]; replyToMessageId?: number }) => {
  const formData = new FormData();
  formData.append('ChatId', data.chatId.toString());
  formData.append('Content', data.content || '');
  formData.append('Type', data.type.toString());
  formData.append('ReplyToMessageId', (data.replyToMessageId || 0).toString());

  // Also append with prefix sendMessageDto. for maximum model binder compatibility
  formData.append('sendMessageDto.ChatId', data.chatId.toString());
  formData.append('sendMessageDto.Content', data.content || '');
  formData.append('sendMessageDto.Type', data.type.toString());
  formData.append('sendMessageDto.ReplyToMessageId', (data.replyToMessageId || 0).toString());

  if (data.attachments && data.attachments.length > 0) {
    for (let i = 0; i < data.attachments.length; i++) {
      const att = data.attachments[i];
      let filePathStr = att.filePath || '';
      if (filePathStr instanceof Blob) {
        try {
          filePathStr = await blobToBase64(filePathStr);
        } catch (e) {
          console.error("Failed to convert Blob to Base64:", e);
          filePathStr = '';
        }
      }
      
      const attObj = {
        fileName: att.fileName || '',
        filePath: filePathStr || '',
        contentType: att.contentType || '',
        fileSize: att.fileSize || 0,
        thumbnailPath: att.thumbnailPath || ''
      };
      
      const jsonStr = JSON.stringify(attObj);
      formData.append('Attachments', jsonStr);
      formData.append('sendMessageDto.Attachments', jsonStr);
    }
  }

  const response = await api.post('/Message/SendMessage', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return response.data;
};

export const editMessage = async (data: { messageId: number; content: string }) => {
  const response = await api.post('/Message/EditMessage', data);
  return response.data;
};

export const getChatMessages = async (chatId: number, page: number = 1, pageSize: number = 100) => {
  const response = await api.get(`/Message/GetChatMessages?chatId=${chatId}&page=${page}&pageSize=${pageSize}`);
  return response.data;
};

export const deleteMessage = async (messageId: number) => {
  const response = await api.post(`/Message/DeleteMessage?messageId=${messageId}`);
  return response.data;
};

export const getUnreadCount = async (chatId: number) => {
  const response = await api.get(`/Message/GetUnreadCount?chatId=${chatId}`);
  return response.data;
};

export const updateGroupChat = async (chatId: number, name?: string, description?: string, imageFile?: File | null) => {
  const formData = new FormData();
  if (imageFile) {
    formData.append('ImageUrl', imageFile);
  }
  
  const params = new URLSearchParams();
  params.append('ChatId', chatId.toString());
  if (name) params.append('Name', name);
  if (description) params.append('Description', description);
  
  const response = await api.put(`/Chat/UpdateGroupChat?${params.toString()}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return response.data;
};

export const deleteChat = async (chatId: number) => {
  const response = await api.put(`/Chat/DeleteChat?chatId=${chatId}`);
  return response.data;
};

export const sendTypingStatus = async (chatId: number) => {
  const response = await api.post(`/Message/Typing?chatId=${chatId}`);
  return response.data;
};

export const joinChatRoom = async (chatId: number) => {
  const response = await api.post(`/Chat/JoinChat?chatId=${chatId}`);
  return response.data;
};

export const getImageUrl = (img?: string) => {
  if (!img) return '';
  if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) return img;
  
  // Check if it's base64 encoded string but doesn't have the data prefix
  if (/^[a-zA-Z0-9+/=]+$/.test(img) && img.length > 100) {
    return `data:image/jpeg;base64,${img}`;
  }
  
  const cleanPath = img.startsWith('/') ? img.slice(1) : img;
  return `${getBaseUrl()}/storage/${cleanPath}`;
};

