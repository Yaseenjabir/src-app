const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

// const mobileDefaultBaseUrl = "https://src-backend-dun.vercel.app/api/v1";
const mobileDefaultBaseUrl = "http://192.168.1.8:5000/api/v1";

export const API_BASE_URL = configuredBaseUrl?.length
  ? configuredBaseUrl
  : mobileDefaultBaseUrl;
