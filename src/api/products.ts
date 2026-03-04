import { apiRequest } from "./http";
import type { PaginatedResponse } from "../types/api";
import type { Product } from "../types/entities";

export function listProductsApi(token: string) {
  return apiRequest<PaginatedResponse<Product>>("/products?limit=20&page=1", {
    method: "GET",
    token,
  });
}
