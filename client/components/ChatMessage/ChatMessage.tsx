import { Message } from "@/types/types";
import styles from "./ChatMessage.module.css";

export default function ChatMessage({
  type = "user",
  text,
  timestamp,
}: Message) {
  return (
    <div
      className={`${styles.container} ${
        type === "user" ? styles.userMessage : styles.aiMessage
      }`}
    >
      <div className={styles.messageBox}>
        <p className={styles.messageText}>{text}</p>
      </div>
    </div>
  );
}
