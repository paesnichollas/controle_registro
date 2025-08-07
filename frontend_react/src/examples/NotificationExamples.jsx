import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/button';

const NotificationExamples = () => {
  const { showSuccess, showError, showInfo, showWarning, showLoading, dismiss } = useNotification();

  const handleSuccessExample = () => {
    showSuccess('Ordem de Serviço criada com sucesso!');
  };

  const handleErrorExample = () => {
    showError('Erro ao salvar item. Tente novamente.');
  };

  const handleLoginErrorExample = () => {
    showError('Usuário ou senha incorretos. Por favor, verifique e tente novamente.');
  };

  const handleInfoExample = () => {
    showInfo('Sistema atualizado com as últimas melhorias.');
  };

  const handleWarningExample = () => {
    showWarning('Atenção: Alguns campos obrigatórios não foram preenchidos.');
  };

  const handleLoadingExample = () => {
    const loadingToast = showLoading('Processando dados...');
    
    // Simular um processo que leva tempo
    setTimeout(() => {
      dismiss(loadingToast);
      showSuccess('Processamento concluído com sucesso!');
    }, 3000);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Exemplos de Notificações</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Button 
          onClick={handleSuccessExample}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Sucesso
        </Button>
        
        <Button 
          onClick={handleErrorExample}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Erro
        </Button>
        
        <Button 
          onClick={handleLoginErrorExample}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Erro de Login
        </Button>
        
        <Button 
          onClick={handleInfoExample}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Informação
        </Button>
        
        <Button 
          onClick={handleWarningExample}
          className="bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          Aviso
        </Button>
        
        <Button 
          onClick={handleLoadingExample}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Loading
        </Button>
      </div>

      <div className="mt-8 p-4 bg-slate-800 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Características das Notificações:</h3>
        <ul className="text-slate-300 space-y-2">
          <li>• <strong>Posição:</strong> Centralizadas no topo da tela</li>
          <li>• <strong>Sucesso:</strong> Fundo verde (#22c55e) com ícone ✓</li>
          <li>• <strong>Erro:</strong> Fundo vermelho (#ef4444) com ícone ✕</li>
          <li>• <strong>Aviso:</strong> Fundo amarelo (#f59e0b) com ícone ⚠</li>
          <li>• <strong>Informação:</strong> Fundo azul (#3b82f6) com ícone ℹ</li>
          <li>• <strong>Texto:</strong> Branco, centralizado e legível</li>
          <li>• <strong>Duração:</strong> 4 segundos (erros: 6 segundos)</li>
          <li>• <strong>Fechamento:</strong> Automático ou manual</li>
          <li>• <strong>Animação:</strong> Slide-in do topo com fade</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationExamples; 