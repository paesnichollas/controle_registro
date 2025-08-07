import { createContext, useContext } from 'react';
import { toast } from 'sonner';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const showSuccess = (message, options = {}) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-center',
      ...options
    });
  };

  const showError = (message, options = {}) => {
    toast.error(message, {
      duration: 6000,
      position: 'top-center',
      ...options
    });
  };

  const showInfo = (message, options = {}) => {
    toast.info(message, {
      duration: 4000,
      position: 'top-center',
      ...options
    });
  };

  const showWarning = (message, options = {}) => {
    toast.warning(message, {
      duration: 4000,
      position: 'top-center',
      ...options
    });
  };

  const showLoading = (message) => {
    return toast.loading(message, {
      position: 'top-center'
    });
  };

  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  const value = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    dismiss
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 