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
  const response = await api.post('/User/VerifyAuthCode', "", {
    params: { authCode },
  });
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
