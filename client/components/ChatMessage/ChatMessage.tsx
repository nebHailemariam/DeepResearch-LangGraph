import { Message } from "@langchain/core/messages";
import ReactMarkdown from "react-markdown";
import styles from "./ChatMessage.module.css";

export default function ChatMessage({ type, content }: Message) {
  const contentString =
    typeof content === "string" ? content : content.toString();

  return (
    <div
      className={`${styles.container} ${
        type === "human" ? styles.userMessage : styles.aiMessage
      }`}
    >
      <div className={styles.messageBox}>
        <div className={styles.messageText}>
          <ReactMarkdown>{contentString}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
