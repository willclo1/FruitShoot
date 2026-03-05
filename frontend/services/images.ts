import { apiUpload } from "./apiUpload";

export type FruitPrediction = {
  fruit: string;
  fruit_index: number;
  fruit_confidence: number;
  fruit_probs: number[];

  ripeness: string;
  ripeness_index: number;
  ripeness_confidence: number;
  ripeness_probs: number[];
};

export type UploadUserImageResponse = {
  id: number;
  filename: string;
  url: string;
  uploaded_at: string;
  prediction: FruitPrediction;
};

export async function uploadUserImage(params: {
  userId: number;
  imageUri: string;
  description?: string;
}): Promise<UploadUserImageResponse> {
  const { userId, imageUri, description } = params;

  const guessMimeType = (uri: string) => {
    const lower = uri.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".heic")) return "image/heic";
    return "image/jpeg";
  };

  const guessFilename = (uri: string) => {
    const last = uri.split("/").pop();
    if (last && last.includes(".")) return last;

    const mime = guessMimeType(uri);
    const ext =
      mime === "image/png" ? "png" :
      mime === "image/webp" ? "webp" :
      mime === "image/heic" ? "heic" :
      "jpg";

    return `upload.${ext}`;
  };

  const form = new FormData();
  form.append("user_id", String(userId));
  if (description?.trim()) form.append("description", description.trim());

  // Field name MUST be "file" to match FastAPI: file: UploadFile = File(...)
  form.append("file", {
    uri: imageUri,
    name: guessFilename(imageUri),
    type: guessMimeType(imageUri),
  } as any);

  // Backend now returns prediction that includes fruit + ripeness
  return apiUpload("/images/upload", form) as Promise<UploadUserImageResponse>;
}