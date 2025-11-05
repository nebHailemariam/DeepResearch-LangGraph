"use client";
import Chat from "@/components/Chat/Chat";
import ChatMessage from "@/components/ChatMessage/ChatMessage";
import Sidebar from "@/components/Sidebar/Sidebar";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChatState } from "@/types/types";
import { useStream } from "@langchain/langgraph-sdk/react";
import styles from "./page.module.css";

function useSearchParam(key: string) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setValue(params.get(key) ?? null);
    }
  }, [key]);

  const update = useCallback(
    (value: string | null) => {
      setValue(value);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (value == null) {
          url.searchParams.delete(key);
        } else {
          url.searchParams.set(key, value);
        }

        window.history.pushState({}, "", url.toString());
      }
    },
    [key]
  );

  return [value, update] as const;
}

export default function Page() {
  const [threadId, onThreadId] = useSearchParam("threadId");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebar_collapsed");
      return stored === "true";
    }
    return false;
  });
  const joinedThreadId = useRef<string | null>(null);

  const thread = useStream<ChatState>({
    apiUrl: "http://localhost:8123",
    assistantId: "chat",
    messagesKey: "messages",
    threadId: threadId ?? undefined,
    onThreadId,
    onCreated: (run) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`resume:${run.thread_id}`, run.run_id);
      }
    },
    onFinish: (_, run) => {
      if (typeof window !== "undefined" && run?.thread_id) {
        window.sessionStorage.removeItem(`resume:${run.thread_id}`);
      }
    },
  });

  useEffect(() => {
    if (!threadId || typeof window === "undefined") return;

    const title =
      ((thread as any).values as ChatState)?.title ||
      ((thread as any).state as ChatState)?.title ||
      (() => {
        const firstHumanMessage = thread.messages.find(
          (m) => m.type === "human"
        );
        if (!firstHumanMessage) return "New Conversation";
        return typeof firstHumanMessage.content === "string"
          ? firstHumanMessage.content.slice(0, 50)
          : "New Conversation";
      })();

    if (!title) return;

    const conversations = JSON.parse(
      localStorage.getItem("deep_research_conversations") || "[]"
    )
      .filter((c: { threadId: string }) => c.threadId !== threadId)
      .slice(0, 49);

    conversations.unshift({
      threadId,
      title: title || "New Conversation",
      timestamp: Date.now(),
    });

    localStorage.setItem(
      "deep_research_conversations",
      JSON.stringify(conversations)
    );

    window.dispatchEvent(new Event("conversationSaved"));
  }, [
    threadId,
    thread.messages.length,
    (thread as any).values,
    (thread as any).state,
  ]);

  useEffect(() => {
    if (!threadId || typeof window === "undefined") return;
    const resume = window.sessionStorage.getItem(`resume:${threadId}`);
    if (resume && joinedThreadId.current !== threadId) {
      thread.joinStream(resume);
      joinedThreadId.current = threadId;
    }
  }, [threadId, thread]);

  const uniqueMessages = useMemo(() => {
    const messageMap = new Map();
    thread.messages.forEach((msg) => messageMap.set(msg.id, msg));
    const messages = Array.from(messageMap.values());

    let latestToolMsg: (typeof messages)[0] | null = null;
    let latestToolIdx = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === "tool") {
        latestToolMsg = messages[i];
        latestToolIdx = i;
        break;
      }
    }

    const hasAIMessageAfterTool =
      latestToolIdx >= 0 &&
      messages.slice(latestToolIdx + 1).some((m) => m.type === "ai");
    const isStreaming =
      thread.isLoading && messages.some((m) => m.type === "ai");

    return messages.filter((msg) => {
      if (msg.type === "tool") {
        if (isStreaming || hasAIMessageAfterTool) return false;
        return msg === latestToolMsg;
      }
      return true;
    });
  }, [thread.messages, thread.isLoading]);

  return (
    <div
      className={styles.container}
      style={
        {
          "--sidebar-width": sidebarCollapsed ? "4rem" : "16rem",
        } as React.CSSProperties
      }
    >
      <button
        className={styles.menuButton}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg
          className={styles.menuIcon}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentThreadId={threadId}
        onThreadSelect={onThreadId}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div
        className={`${styles.mainContent} ${
          sidebarCollapsed ? styles.sidebarCollapsed : ""
        }`}
      >
        <div className={styles.messagesContainer}>
          {uniqueMessages.map((message) => (
            <ChatMessage
              key={message.id}
              type={message.type}
              content={message.content}
            />
          ))}
        </div>

        <div className={styles.chatWrapper}>
          <Chat
            onSendMessage={(message) => {
              thread.submit(
                { messages: [{ type: "human", content: message }] },
                { streamResumable: true }
              );
            }}
            isLoading={thread.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
