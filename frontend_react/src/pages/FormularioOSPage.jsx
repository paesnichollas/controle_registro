import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormularioOS from '../components/FormularioOS';
import { useAuth } from '../hooks/useAuth';

export default function FormularioOSPage() {
  const navigate = useNavigate();
  const { osId } = useParams();
  const { isAllowed } = useAuth();

  // Verificar se o usuário tem permissão (qualquer grupo permitido pode acessar)
  if (!isAllowed()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-white-900">Você não tem permissão para acessar esta página.</p>
          <Button 
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // Redirecionar para a lista de OS após salvar
    navigate('/ordens-servico');
  };

  const handleCancel = () => {
    // Voltar para a lista de OS
    navigate('/ordens-servico');
  };

  return (
    <div className="min-h-screen py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {osId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
              </h1>
              <p className="text-gray-200">
                {osId ? 'Edite os dados da ordem de serviço' : 'Preencha os dados da nova ordem de serviço'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-slate-600 text-gray-100 hover:bg-slate-700 bg-zinc-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Formulário */}
        <FormularioOS
          osId={osId ? parseInt(osId) : null}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
} 