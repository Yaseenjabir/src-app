import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { Product } from "../types/entities";

type ListProductsOptions = {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
};

export type ProductPayload = {
  name: string;
  model: string;
  price: number;
  is_active?: boolean;
};

export function listProductsApi(
  token: string,
  options: ListProductsOptions = {},
) {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 100));

  if (options.q?.trim()) {
    params.set("q", options.q.trim());
  }
  if (typeof options.isActive === "boolean") {
    params.set("isActive", String(options.isActive));
  }

  return apiRequest<PaginatedResponse<Product>>(
    `/products?${params.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

export function getProductModelsApi(token: string) {
  return apiRequest<{ models: string[] }>("/products/models", {
    method: "GET",
    token,
  });
}

export function createProductApi(token: string, body: ProductPayload) {
  return apiRequest<Product>("/products", {
    method: "POST",
    token,
    body,
  });
}

export function updateProductApi(
  token: string,
  productId: string,
  body: Partial<ProductPayload>,
) {
  return apiRequest<Product>(`/products/${productId}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteProductApi(token: string, productId: string) {
  return apiRequest(`/products/${productId}`, {
    method: "DELETE",
    token,
  });
}
