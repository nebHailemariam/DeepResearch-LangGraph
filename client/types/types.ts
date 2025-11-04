import { Message } from "@langchain/langgraph-sdk";

export type ChatState = {
  messages: Message[];
  router_next?: string;
};
