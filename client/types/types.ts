export interface Message {
  id: string;
  type: "user" | "AI";
  text: string;
  timestamp: string;
}
