import { apiRequest } from "./http";
import type {
  LoginRequestBody,
  LoginResponse,
  MeResponse,
} from "../types/auth";

export function loginApi(body: LoginRequestBody) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body,
  });
}

export function meApi(token: string) {
  return apiRequest<MeResponse>("/auth/me", {
    method: "GET",
    token,
  });
}
