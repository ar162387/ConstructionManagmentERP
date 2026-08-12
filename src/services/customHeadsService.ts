import { api } from "./api";
export interface ApiCustomHead { id: string; name: string }
export const listCustomHeads = () => api<ApiCustomHead[]>("/api/custom-heads");
