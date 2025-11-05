"use client";

import styles from "./Chat.module.css";
import { useRef, useState } from "react";

interface ChatProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export default function Chat({ onSendMessage, isLoading = false }: ChatProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message || isLoading) return;

    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "1.5rem";
    }

    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <form className={styles.inputWrapper} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder="Message Deep Research..."
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className={styles.sendButton}
          type="submit"
          aria-label="Send message"
          disabled={isLoading || !inputValue.trim()}
        >
          <svg
            className={styles.sendIcon}
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
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
