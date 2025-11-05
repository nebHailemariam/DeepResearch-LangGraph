import styles from "./ToolMessage.module.css";

interface ToolMessageProps {
  type: string;
  content: any;
}

export default function ToolMessage({ type, content }: ToolMessageProps) {
  const contentString = typeof content === "string" ? content : String(content);

  return (
    <div className={styles.container}>
      <div className={styles.toolMessageBox}>
        <div className={styles.content}>
          <div className={styles.text}>{contentString}</div>
          <div className={styles.loadingIndicator}>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
