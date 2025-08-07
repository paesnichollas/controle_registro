import { Loader2 } from 'lucide-react';

/**
 * Componente de loading reutilizável
 * @param {Object} props
 * @param {string} props.message - Mensagem de loading
 * @param {string} props.size - Tamanho do spinner (sm, md, lg)
 * @param {boolean} props.fullScreen - Se deve ocupar tela inteira
 * @param {string} props.className - Classes CSS adicionais
 */
const LoadingSpinner = ({ 
  message = "Carregando...", 
  size = "md", 
  fullScreen = false,
  className = ""
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  const spinner = (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      <span className="text-sm">{message}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;

/**
 * Componente de loading para tela inteira
 */
export const FullScreenLoading = ({ message = "Carregando..." }) => (
  <LoadingSpinner message={message} fullScreen={true} />
);

/**
 * Componente de loading simples
 */
export const SimpleLoading = ({ message = "Carregando..." }) => (
  <LoadingSpinner message={message} size="sm" />
); 