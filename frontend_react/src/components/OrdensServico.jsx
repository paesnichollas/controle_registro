import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { osAPI } from '../lib/api.jsx';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";
import { formatCurrency } from '../lib/currencyUtils.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';

export default function OrdensServico() {
  const navigate = useNavigate();
  const { hasGroup } = useAuth();
  const { showSuccess, showError, showLoading, dismiss } = useNotification();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Verificar se o usuário pertence ao grupo "Qualidade"
  const isQualityGroup = hasGroup('Qualidade');

  useEffect(() => {
    loadOrdens();
    loadStatusOptions();
  }, [currentPage, searchTerm, statusFilter]);

  const loadStatusOptions = async () => {
    try {
      setLoadingStatus(true);
      const statusData = await osAPI.getStatusOS();
      setStatusOptions(statusData || []);
    } catch {
      console.error('Erro ao carregar opções de status');
      // Fallback para opções padrão em caso de erro
      setStatusOptions([
        { id: 'ABERTA', nome: 'Aberta' },
        { id: 'EM_ANDAMENTO', nome: 'Em Andamento' },
        { id: 'CONCLUIDA', nome: 'Concluída' },
        { id: 'CANCELADA', nome: 'Cancelada' }
      ]);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadOrdens = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        search: searchTerm,
        status: statusFilter === 'todos' ? '' : statusFilter
      };
      
      const response = await osAPI.list(params);
      setOrdens(response?.results || []);
      setTotalPages(Math.ceil((response?.count || 0) / 10));
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      setError('Erro ao carregar ordens de serviço. Tente novamente.');
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNovaOS = () => {
    navigate('/ordens-servico/nova');
  };

  const handleEditOS = (osId) => {
    navigate(`/ordens-servico/${osId}/editar`);
  };

  const handleDeleteOS = async (osId) => {
    if (window.confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      const loadingToast = showLoading('Excluindo ordem de serviço...');
      
      try {
        await osAPI.delete(osId);
        dismiss(loadingToast);
        showSuccess('Ordem de serviço excluída com sucesso!');
        loadOrdens();
      } catch (error) {
        console.error('Erro ao excluir ordem de serviço:', error);
        dismiss(loadingToast);
        showError('Erro ao excluir ordem de serviço. Tente novamente.');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (statusNome) => {
    if (!statusNome) return (
      <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 border-gray-500/30">
        N/A
      </Badge>
    );
    
    const statusConfig = {
      'Aberta': {
        className: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
        icon: AlertTriangle,
        iconColor: 'text-blue-400'
      },
      'Em Andamento': {
        className: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
        icon: PlayCircle,
        iconColor: 'text-yellow-400'
      },
      'Concluída': {
        className: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle,
        iconColor: 'text-emerald-400'
      },
      'Cancelada': {
        className: 'bg-red-600/20 text-red-300 border-red-500/30',
        icon: XCircle,
        iconColor: 'text-red-400'
      }
    };
    
    const config = statusConfig[statusNome] || statusConfig['Aberta'];
    const Icon = config.icon;
    
    return (
      <Badge variant="secondary" className={`${config.className} px-3 py-1 text-sm font-medium`}>
        <Icon className={`w-4 h-4 mr-1 ${config.iconColor}`} />
        {statusNome}
      </Badge>
    );
  };

  // Se houver erro, mostrar mensagem
  if (error) {
    return (
      <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Ordens de Serviço
            </h1>
            <p className="text-gray-400 mt-1">Gerencie as ordens de serviço do sistema</p>
          </div>
          {!isQualityGroup && (
            <Button 
              onClick={handleNovaOS} 
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova OS
            </Button>
          )}
        </div>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-900/20 to-red-800/10 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">Erro ao Carregar Dados</h3>
              <p className="text-gray-300 mb-6">{error}</p>
              <Button 
                onClick={loadOrdens} 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl"
              >
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Ordens de Serviço
          </h1>
          <p className="text-gray-400 mt-1">Gerencie as ordens de serviço do sistema</p>
        </div>
        {!isQualityGroup && (
          <Button 
            onClick={handleNovaOS} 
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova OS
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-100">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <LabelObrigatorio obrigatorio={false} htmlFor="search" className="text-gray-100 font-medium">
                Buscar
              </LabelObrigatorio>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por número, cliente, descrição, status, valor, responsável ou prazo..."
                  className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl pl-10 placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="space-y-3">
              <LabelObrigatorio obrigatorio={false} htmlFor="status" className="text-gray-100 font-medium">
                Status
              </LabelObrigatorio>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl">
                  <SelectValue placeholder={loadingStatus ? "Carregando..." : "Todos os status"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 text-white border-slate-600">
                  <SelectItem value="todos">Todos</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de OS */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-100">Lista de Ordens de Serviço</CardTitle>
                <CardDescription className="text-gray-400">
                  {loading ? 'Carregando...' : `${ordens.length} ordem(s) encontrada(s)`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Carregando ordens de serviço...</p>
              </div>
            </div>
          ) : ordens.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Nenhuma ordem de serviço encontrada</h3>
              <p className="text-gray-500 mb-6">
                {isQualityGroup 
                  ? "Não há ordens de serviço disponíveis para edição." 
                  : "Comece criando sua primeira ordem de serviço."
                }
              </p>
              {!isQualityGroup && (
                <Button 
                  onClick={handleNovaOS} 
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Primeira OS
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {ordens.map((os) => (
                <Card key={os.id} className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                              <FileText className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="flex items-center gap-4">
                              <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
                                Registro #{os.numero_os}
                              </h3>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(os.status_os_nome)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-gray-300 font-medium">
                            {os.nome_cliente_nome || 'Cliente não informado'}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {os.descricao_resumida || 'Sem descrição'}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            <div>
                              <span className="text-xs text-gray-400">Data Solicitação:</span>
                              <p className="text-sm font-medium text-gray-200">{formatDate(os.data_solicitacao_os)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                            <Clock className="w-4 h-4 text-orange-400" />
                            <div>
                              <span className="text-xs text-gray-400">Prazo:</span>
                              <p className="text-sm font-medium text-gray-200">{formatDate(os.prazo_execucao_servico)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <div>
                              <span className="text-xs text-gray-400">Valor Total:</span>
                              <p className="text-sm font-medium text-gray-200">{formatCurrency(os.saldo_final)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                            <User className="w-4 h-4 text-purple-400" />
                            <div>
                              <span className="text-xs text-gray-400">Responsável:</span>
                              <p className="text-sm font-medium text-gray-200">{os.nome_diligenciador_os_nome || 'Não informado'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        {/* <Button
                          size="sm"
                          onClick={() => handleViewOS(os.id)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-300 px-4 py-2 rounded-lg"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button> */}
                        <Button
                          size="sm"
                          onClick={() => handleEditOS(os.id)}
                          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 px-4 py-2 rounded-lg"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOS(os.id)}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all duration-300 px-4 py-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Paginação */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-slate-600/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 transition-all duration-200 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/30 rounded-lg">
                <span className="text-gray-300 font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 transition-all duration-200 rounded-lg"
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

