import { apiRequest } from "./http";
import type { ProductModel } from "../types/entities";

type ProductModelPayload = {
  label: string;
};

export function listProductModelsApi(token: string) {
  return apiRequest<{ items: ProductModel[] }>("/product-models", {
    method: "GET",
    token,
  });
}

export function createProductModelApi(
  token: string,
  body: ProductModelPayload,
) {
  return apiRequest<ProductModel>("/product-models", {
    method: "POST",
    token,
    body,
  });
}

export function updateProductModelApi(
  token: string,
  id: string,
  body: Partial<ProductModelPayload>,
) {
  return apiRequest<ProductModel>(`/product-models/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteProductModelApi(token: string, id: string) {
  return apiRequest(`/product-models/${id}`, {
    method: "DELETE",
    token,
  });
}
