import axios from 'axios';

const BASE_URL = 'https://kv5zhpcr-7190.uks1.devtunnels.ms/Home_Security';
//q9l0xpmb lenovo
//kv5zhpcr dell
export const saveToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

export const getToken = () => {
  return localStorage.getItem('auth_token');
};

export const saveUserDetails = (details: any) => {
  localStorage.setItem('user_details', JSON.stringify(details));
};

export const getUserDetails = () => {
  const details = localStorage.getItem('user_details');
  return details ? JSON.parse(details) : null;
};

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
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

export const sendMessage = async (data: { chatId: number; content?: string; type: number; attachments: any[] }) => {
  const response = await api.post('/Message/SendMessage', data);
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
