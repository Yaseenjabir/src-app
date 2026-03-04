const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const mobileDefaultBaseUrl = "http://192.168.2.8:5000/api/v1";

export const API_BASE_URL = configuredBaseUrl?.length
  ? configuredBaseUrl
  : mobileDefaultBaseUrl;
