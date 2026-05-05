'use client'
import styles from './agents.module.css'

interface SecureModalProps {
  onContinue: () => void
  onClose: () => void
}

export function SecureModal({ onContinue, onClose }: SecureModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.secureModal} onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: 'var(--border-light)', borderRadius: 2, margin: '0 auto 24px' }} />

        <div className={styles.secureIconWrap}>🛡️</div>

        <h2 className={styles.secureTitle}>Encrypted Secure Channel</h2>
        <p className={styles.secureDesc}>
          To protect your information, we use end-to-end encryption<br />
          Ensures all conversations with AI Agent cannot be accessed by third parties
        </p>

        <div className={styles.secureBadges}>
          <span className={styles.secureBadge}>🔒 End-to-End Encrypted</span>
          <span className={styles.secureBadge}>🛡 Isolated Sandbox</span>
          <span className={styles.secureBadge}>⊘ No Data Retention</span>
        </div>

        <button className={styles.btnContinue} onClick={onContinue}>
          Continue
        </button>
        <p className={styles.secureNote}>
          Conversation data is processed locally on your device only
        </p>
      </div>
    </div>
  )
}
