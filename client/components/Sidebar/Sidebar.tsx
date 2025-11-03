"use client";

import styles from "./Sidebar.module.css";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <aside
        id="default-sidebar"
        className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}
        aria-label="Sidebar"
      >
        <div className={styles.sidebarContainer}>
          <ul className={styles.menu}>
            <li>
              <a href="#" className={styles.menuTitle}>
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
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
