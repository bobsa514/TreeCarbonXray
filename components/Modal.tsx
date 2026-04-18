import React, { useEffect } from 'react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const widths = { sm: 480, md: 720, lg: 960, xl: 1120 };

const Modal: React.FC<ModalProps> = ({ children, onClose, size = 'md' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.dialog, maxWidth: widths[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={styles.close} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(26,29,26,0.38)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 32,
    animation: 'fadeUp .2s ease',
  },
  dialog: {
    background: 'var(--paper)',
    borderRadius: 'var(--r-lg)',
    width: '100%',
    maxHeight: '88vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: 'var(--shadow-lift)',
    border: '1px solid var(--stone)',
  },
  close: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: '50%',
    border: '1px solid var(--stone-2)',
    background: 'var(--paper)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--ink)',
    zIndex: 2,
  },
};

export default Modal;
