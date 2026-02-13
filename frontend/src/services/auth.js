import axios from "axios";

let accessToken = null;
let refreshToken = null;

const AUTH_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:8000/api/").replace(/\/?$/, "/");

const setTokens = (tokens) => {
  accessToken = tokens?.access || null;
  refreshToken = tokens?.refresh || refreshToken;
};

export const login = async (username, password) => {
  const response = await axios.post(`${AUTH_BASE_URL}token/`, {
    username,
    password,
  });
  setTokens(response.data);
  return response.data;
};

export const register = (userData) => {
  const url = `${AUTH_BASE_URL}register/`;
  console.log("Sending register request to:", url, userData);
  return axios.post(url, userData, {
    headers: {},
  });
};

export const refreshAccessToken = async () => {
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }
  const response = await axios.post(`${AUTH_BASE_URL}token/refresh/`, {
    refresh: refreshToken,
  });
  accessToken = response.data.access;
  if (response.data.refresh) {
    refreshToken = response.data.refresh;
  }
  return accessToken;
};

export const logout = () => {
  accessToken = null;
  refreshToken = null;
};

export const getAccessToken = () => accessToken;

export const getRefreshToken = () => refreshToken;

export const isAuthenticated = () => Boolean(accessToken);
