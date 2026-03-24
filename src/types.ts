export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type Mode = "chat" | "image";

export type Settings = {
  huggingFaceKey: string;
};
