import { apiUpload } from "./apiUpload";

export async function uploadUserImage(params: {
  userId: number;
  imageUri: string;
  description?: string;
}) {
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
    const ext = guessMimeType(uri) === "image/png" ? "png" : "jpg";
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

  return apiUpload("/images/upload", form);
}