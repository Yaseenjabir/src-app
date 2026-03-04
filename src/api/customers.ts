import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { Customer } from "../types/entities";

type ListCustomersOptions = {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
};

type CreateCustomerPayload = {
  name: string;
  shop_name?: string;
  address?: string;
  phone?: string;
  notes?: string;
  is_active?: boolean;
};

export function listCustomersApi(
  token: string,
  options: ListCustomersOptions = {},
) {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 20));

  if (options.q?.trim()) {
    params.set("q", options.q.trim());
  }

  if (typeof options.isActive === "boolean") {
    params.set("isActive", String(options.isActive));
  }

  return apiRequest<PaginatedResponse<Customer>>(
    `/customers?${params.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createCustomerApi(token: string, body: CreateCustomerPayload) {
  return apiRequest<Customer>("/customers", {
    method: "POST",
    token,
    body,
  });
}
