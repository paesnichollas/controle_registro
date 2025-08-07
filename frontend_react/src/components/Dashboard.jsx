import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Users, 
  BarChart3, 
  Target,
  RefreshCw,
  AlertCircle,
  FileText,
  Edit
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard.js';
import { useAuth } from '../hooks/useAuth.jsx';
import CardsEstatisticas from './CardsEstatisticas.jsx';
import AtividadesRecentes from './AtividadesRecentes.jsx';
import GraficosDashboard from './GraficosDashboard.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { dashboardData, loading, refreshing, error, refreshData } = useDashboard();
  const { hasGroup } = useAuth();

  const handleNovaOS = () => {
    navigate('/ordens-servico/nova');
  };

  const handleGerenciarClientes = () => {
    navigate('/clientes');
  };

  const handleRelatorios = () => {
    navigate('/relatorios');
  };

  const handleOrdensServico = () => {
    navigate('/ordens-servico');
  };

  // Verificar se o usuário pertence aos grupos "Básico" ou "Qualidade"
  const isBasicOrQuality = hasGroup(['Básico', 'Qualidade']);
  
  // Verificar especificamente se o usuário pertence ao grupo "Qualidade"
  const isQualityGroup = hasGroup('Qualidade');

  if (loading) {
    return (
      <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400">Visão geral do sistema de controle de Registros</p>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400">Visão geral do sistema de controle de Registros</p>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={refreshData} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400">Visão geral do sistema de controle de Registros</p>
        </div>
        
        <Button
          onClick={refreshData}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <CardsEstatisticas dados={dashboardData} />

      {/* Ações Rápidas e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-100">Ações Rápidas</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isQualityGroup ? (
              <Button 
                onClick={handleOrdensServico}
                className="w-full justify-start bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-300 h-12 rounded-xl"
              >
                <FileText className="mr-3 h-5 w-5" />
                Gerenciar Ordens de Serviço
              </Button>
            ) : (
              <Button 
                onClick={handleNovaOS}
                className="w-full justify-start bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 h-12 rounded-xl"
              >
                <Plus className="mr-3 h-5 w-5" />
                Nova Ordem de Serviço
              </Button>
            )}
            {!isBasicOrQuality && (
              <>
                <Button 
                  onClick={handleGerenciarClientes}
                  className="w-full justify-start bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 h-12 rounded-xl"
                >
                  <Users className="mr-3 h-5 w-5" />
                  Gerenciar Clientes
                </Button>
                <Button 
                  onClick={handleRelatorios}
                  className="w-full justify-start bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-300 h-12 rounded-xl"
                >
                  <BarChart3 className="mr-3 h-5 w-5" />
                  Relatórios
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <AtividadesRecentes atividades={dashboardData.atividades_recentes} />
      </div>

      {/* Gráficos */}
      <GraficosDashboard 
        graficoOSPorMes={dashboardData.grafico_os_por_mes}
        graficoValoresPorMes={dashboardData.grafico_valores_por_mes}
      />
    </div>
  );
}

