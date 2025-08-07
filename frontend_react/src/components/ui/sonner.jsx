import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-center"
      richColors={false}
      closeButton={true}
      duration={4000}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        }
      }
      toastOptions={{
        style: {
          background: 'var(--toast-bg, #2a2b30)',
          color: 'var(--toast-text, #ffffff)',
          border: 'var(--toast-border, 1px solid #374151)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '14px',
          fontWeight: '500',
          textAlign: 'center',
          maxWidth: '400px',
          minWidth: '300px',
          padding: '12px 16px',
        },
        success: {
          style: {
            background: '#22c55e',
            color: '#ffffff',
            border: '1px solid #16a34a',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
          },
          icon: '✓',
        },
        error: {
          style: {
            background: '#ef4444',
            color: '#ffffff',
            border: '1px solid #dc2626',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
          },
          icon: '✕',
        },
        warning: {
          style: {
            background: '#f59e0b',
            color: '#ffffff',
            border: '1px solid #d97706',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
          },
          icon: '⚠',
        },
        info: {
          style: {
            background: '#3b82f6',
            color: '#ffffff',
            border: '1px solid #2563eb',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
          },
          icon: 'ℹ',
        },
      }}
      {...props} />
  );
}

export { Toaster }
