"use client";

import { useState, useEffect } from "react";
import styles from "./Sidebar.module.css";

interface Conversation {
  threadId: string;
  title: string;
  timestamp: number;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentThreadId?: string | null;
  onThreadSelect?: (threadId: string | null) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({
  isOpen = false,
  onClose,
  currentThreadId,
  onThreadSelect,
  onCollapsedChange,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebar_collapsed");
      return stored === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadConversations = () => {
      const stored = localStorage.getItem("deep_research_conversations");
      if (stored) {
        try {
          const convs = JSON.parse(stored);
          const sorted = convs.sort(
            (a: Conversation, b: Conversation) => b.timestamp - a.timestamp
          );
          setConversations(sorted);
        } catch (e) {
          console.error("Error loading conversations:", e);
        }
      }
    };

    loadConversations();

    const handleStorageChange = () => loadConversations();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("conversationSaved", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("conversationSaved", handleStorageChange);
    };
  }, []);

  const handleNewChat = () => {
    onThreadSelect?.(null);
    onClose?.();
  };

  const handleConversationClick = (threadId: string) => {
    onThreadSelect?.(threadId);
    onClose?.();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_collapsed", String(newCollapsed));
    }
    onCollapsedChange?.(newCollapsed);
  };

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <aside
        id="default-sidebar"
        className={`${styles.sidebar} ${isOpen ? styles.open : ""} ${
          isCollapsed ? styles.collapsed : ""
        }`}
        aria-label="Sidebar"
        onClick={isCollapsed ? toggleCollapse : undefined}
        style={isCollapsed ? { cursor: "pointer" } : undefined}
      >
        <div className={styles.sidebarContainer}>
          <button
            className={`${styles.collapseButton} ${
              isCollapsed ? styles.hidden : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg
              className={styles.collapseIcon}
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <ul className={styles.menu}>
            <li>
              <div className={styles.brand}>
                <svg
                  className={styles.icon}
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  <circle cx="8" cy="7" r="1" />
                  <circle cx="12" cy="7" r="1" />
                  <circle cx="16" cy="7" r="1" />
                </svg>
                <span className={styles.labelSimple}>Deep Research</span>
              </div>
            </li>
            <li>
              <button
                onClick={(e) => {
                  if (isCollapsed) {
                    e.stopPropagation();
                    toggleCollapse();
                  }
                  handleNewChat();
                }}
                className={styles.menuTitle}
                title={isCollapsed ? "New Chat" : undefined}
              >
                <svg
                  className={styles.icon}
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className={styles.labelSimple}>New Chat</span>
              </button>
            </li>
          </ul>

          {conversations.length > 0 && (
            <div
              className={`${styles.conversationsSection} ${
                isCollapsed ? styles.hidden : ""
              }`}
            >
              <ul className={styles.conversationList}>
                {conversations.map((conv) => (
                  <li key={conv.threadId}>
                    <button
                      onClick={() => handleConversationClick(conv.threadId)}
                      className={`${styles.conversationItem} ${
                        currentThreadId === conv.threadId ? styles.active : ""
                      }`}
                    >
                      <span className={styles.conversationTitle}>
                        {conv.title}
                      </span>
                      <span className={styles.conversationDate}>
                        {formatDate(conv.timestamp)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
