import { apiFetch } from "./apiFetch";

export type AddRetrainPayload = {
  image_id: number;
  fruit_index: number;
  ripeness_index: number | null;
  fruit_confidence: number;
  ripeness_confidence: number;
};

export async function addRetrainingSample(payload: AddRetrainPayload) {
  const res = await apiFetch("/retrain/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || "Failed to add retraining sample");
  }

  return res.json();
}