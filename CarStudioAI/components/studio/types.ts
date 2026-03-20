export type QueueItemStatus = "idle" | "processing" | "done" | "error";

export type QueueItem = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  status: QueueItemStatus;
  resultUrl: string | null;
  error: string | null;
};

export type QueueItemView = Omit<QueueItem, "file">;
