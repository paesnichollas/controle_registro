import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Database,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { authAPI } from '../lib/api.jsx';
import { toast } from 'sonner';
import BlocoFormulario from '../components/BlocoFormulario';
import { useAuth } from '../hooks/useAuth.jsx';

export default function GerenciarSelectsPage() {
  const { hasGroup } = useAuth();
  const [selects, setSelects] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState('');
  const [formData, setFormData] = useState({ nome: '', descricao: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExistingItem, setSelectedExistingItem] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isAddMode, setIsAddMode] = useState(false);

  // Lista de modelos organizados em blocos temáticos
  const blocosCategorias = [
    {
      titulo: 'Controle de Qualidade',
      categorias: [
        { nome: 'TipoCQ', titulo: 'Tipos de CQ', campo: 'nome' },
        { nome: 'NivelCQ', titulo: 'Níveis de CQ', campo: 'nome' },
        { nome: 'EnsaioCQ', titulo: 'Ensaios de CQ', campo: 'nome' },
        { nome: 'PercentualCQ', titulo: 'Percentuais de CQ', campo: 'percentual' },
      ]
    },
    {
      titulo: 'Status do Sistema',
      categorias: [
        { nome: 'StatusDMS', titulo: 'Status de DMS', campo: 'status' },
        { nome: 'StatusBMS', titulo: 'Status de BMS', campo: 'status' },
        { nome: 'StatusFRS', titulo: 'Status de FRS', campo: 'status' },
        { nome: 'StatusOS', titulo: 'Status de OS', campo: 'nome' },
        { nome: 'StatusOSManual', titulo: 'Status de OS Manual', campo: 'nome' },
        { nome: 'StatusOSEletronica', titulo: 'Status de OS Eletrônica', campo: 'nome' },
        { nome: 'StatusLevantamento', titulo: 'Status de Levantamento', campo: 'nome' },
        { nome: 'StatusProducao', titulo: 'Status de Produção', campo: 'nome' },
        { nome: 'StatusMaterial', titulo: 'Status de Material', campo: 'nome' },
      ]
    },
    {
      titulo: 'Responsáveis e Execução',
      categorias: [
        { nome: 'NomeDiligenciadorOS', titulo: 'Diligenciadores de OS', campo: 'nome' },
        { nome: 'NomeResponsavelExecucaoServico', titulo: 'Responsáveis de Execução', campo: 'nome' },
        { nome: 'ResponsavelMaterial', titulo: 'Responsáveis de Material', campo: 'nome' },
      ]
    },
    {
      titulo: 'Documentação e Solicitações',
      categorias: [
        { nome: 'AcaoSolicitacaoOption', titulo: 'Ações de Solicitação', campo: 'descricao' },
        { nome: 'TipoDocumentoSolicitacao', titulo: 'Tipos de Documento de Solicitação', campo: 'nome' },
      ]
    },
    {
      titulo: 'Demandas e Regimes',
      categorias: [
        { nome: 'Demanda', titulo: 'Demandas', campo: 'nome' },
        { nome: 'RegimeOS', titulo: 'Regimes de OS', campo: 'nome' },
      ]
    },
    {
      titulo: 'Materiais',
      categorias: [
        { nome: 'TipoMaterial', titulo: 'Tipos de Material', campo: 'nome' },
      ]
    }
  ];

  // Função para obter todas as categorias ordenadas alfabeticamente
  const getAllCategorias = () => {
    return blocosCategorias
      .flatMap(bloco => bloco.categorias)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  };

  // Função para filtrar categorias baseado no termo de pesquisa
  const getCategoriasFiltradas = () => {
    if (!searchTerm.trim()) {
      return blocosCategorias;
    }

    const termo = searchTerm.toLowerCase();
    return blocosCategorias.map(bloco => ({
      ...bloco,
      categorias: bloco.categorias.filter(categoria => 
        categoria.titulo.toLowerCase().includes(termo)
      )
    })).filter(bloco => bloco.categorias.length > 0);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getGerenciarSelects();
      setSelects(response);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar esta funcionalidade');
      } else {
        toast.error('Erro ao carregar dados. Tente novamente.');
      }
      setSelects({});
    } finally {
      setLoading(false);
    }
  };

  // Função otimizada para atualizar apenas uma categoria específica
  const atualizarCategoriaEspecifica = async (modelo) => {
    try {
      const response = await authAPI.getGerenciarSelects();
      setSelects(prevSelects => ({
        ...prevSelects,
        [modelo]: response[modelo]
      }));
    } catch (error) {
      console.error(`Erro ao atualizar categoria ${modelo}:`, error);
      // Em caso de erro, recarrega todos os dados como fallback
      await carregarDados();
    }
  };

  // Função utilitária para determinar o campo correto baseado no modelo
  const getCampoCorreto = (modelo) => {
    const modelosEspeciais = {
      'AcaoSolicitacaoOption': 'descricao',
      'PercentualCQ': 'percentual',
      'StatusDMS': 'status',
      'StatusBMS': 'status',
      'StatusFRS': 'status'
    };
    return modelosEspeciais[modelo] || 'nome';
  };

  // Função para atualizar o estado local imediatamente após operações
  const atualizarEstadoLocal = (modelo, operacao, item = null) => {
    setSelects(prevSelects => {
      const categoriaAtual = prevSelects[modelo] || { total: 0, itens: [] };
      
      const campo = getCampoCorreto(modelo);
      
      switch (operacao) {
        case 'adicionar':
          if (item) {
            // Garantir que o item tenha o campo correto
            const itemComCampoCorreto = {
              ...item,
              nome: item[campo] || item.nome // Usar o campo correto como nome para exibição
            };
            return {
              ...prevSelects,
              [modelo]: {
                ...categoriaAtual,
                total: categoriaAtual.total + 1,
                itens: [...categoriaAtual.itens, itemComCampoCorreto]
              }
            };
          }
          break;
          
        case 'editar':
          if (item) {
            // Garantir que o item tenha o campo correto
            const itemComCampoCorreto = {
              ...item,
              nome: item[campo] || item.nome // Usar o campo correto como nome para exibição
            };
            return {
              ...prevSelects,
              [modelo]: {
                ...categoriaAtual,
                itens: categoriaAtual.itens.map(i => 
                  i.id === item.id ? itemComCampoCorreto : i
                )
              }
            };
          }
          break;
          
        case 'excluir':
          if (item) {
            return {
              ...prevSelects,
              [modelo]: {
                ...categoriaAtual,
                total: Math.max(0, categoriaAtual.total - 1),
                itens: categoriaAtual.itens.filter(i => i.id !== item.id)
              }
            };
          }
          break;
      }
      
      return prevSelects;
    });
  };

  const abrirDialogAdicionar = (modelo) => {
    setIsAddMode(true);
    setEditingItem(null);
    setSelectedModelo(modelo);
    setFormData({ nome: '', descricao: '' });
    setSelectedExistingItem('');
    setDialogOpen(true);
  };

  const abrirDialogEditar = (modelo) => {
    setIsAddMode(false);
    setEditingItem(null);
    setSelectedModelo(modelo);
    setFormData({ nome: '', descricao: '' });
    setSelectedExistingItem('');
    setDialogOpen(true);
  };

  const toggleExpandedCategory = (categoriaNome) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoriaNome]: !prev[categoriaNome]
    }));
  };

  const salvarItem = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (isAddMode) {
        // Adicionar novo item
        const response = await authAPI.adicionarItemSelect({
          modelo: selectedModelo,
          nome: formData.nome
        });
        
        // Determinar o campo correto baseado no modelo
        const campo = getCampoCorreto(selectedModelo);
        
        // Atualizar estado local imediatamente com o novo item
        if (response && response.item) {
          // Garantir que o item tenha o campo correto
          const itemComCampoCorreto = {
            ...response.item,
            [campo]: response.item.nome,
            nome: response.item.nome // Para exibição
          };
          
          atualizarEstadoLocal(selectedModelo, 'adicionar', itemComCampoCorreto);
        } else {
          // Se não receber o item na resposta, atualizar a categoria específica
          await atualizarCategoriaEspecifica(selectedModelo);
        }
        
        toast.success('Item adicionado com sucesso!');
      } else {
        // Editar item existente
        if (!selectedExistingItem) {
          toast.error('Selecione um item para editar');
          return;
        }

        const response = await authAPI.editarItemSelect({
          modelo: selectedModelo,
          item_id: parseInt(selectedExistingItem),
          nome: formData.nome
        });
        
        // Determinar o campo correto baseado no modelo
        const campo = getCampoCorreto(selectedModelo);
        
        // Atualizar estado local imediatamente
        const itemAtualizado = { 
          id: parseInt(selectedExistingItem),
          [campo]: formData.nome,
          nome: formData.nome // Para exibição
        };
        atualizarEstadoLocal(selectedModelo, 'editar', itemAtualizado);
        
        toast.success('Item atualizado com sucesso!');
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para realizar esta ação');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data?.error || 'Erro ao salvar item');
      } else {
        toast.error('Erro ao salvar item. Tente novamente.');
      }
    }
  };

  const excluirItem = async (modelo, item) => {
    // Verificar se usuário é administrador para exclusão
    if (!hasGroup('Administrador')) {
      toast.error('Apenas administradores podem excluir itens.');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir "${item.nome}"?`)) {
      return;
    }

    try {
      await authAPI.excluirItemSelect({
        modelo: modelo,
        item_id: item.id
      });
      
      // Atualizar estado local imediatamente
      atualizarEstadoLocal(modelo, 'excluir', item);
      
      toast.success('Item excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para realizar esta ação');
      } else if (error.response?.status === 404) {
        toast.error('Item não encontrado');
      } else {
        toast.error('Erro ao excluir item. Tente novamente.');
      }
    }
  };

  const getModeloTitulo = (modeloNome) => {
    const categoria = getAllCategorias().find(c => c.nome === modeloNome);
    return categoria ? categoria.titulo : modeloNome;
  };

  const getTotalItens = () => {
    return Object.values(selects).reduce((total, modelo) => total + (modelo.total || 0), 0);
  };

  const getItensExistentes = () => {
    const dadosModelo = selects[selectedModelo] || { itens: [] };
    return dadosModelo.itens || [];
  };

  const handleExistingItemSelect = (itemId) => {
    const item = getItensExistentes().find(i => i.id === parseInt(itemId));
    if (item) {
      setFormData({ 
        nome: item.nome, 
        descricao: item.descricao || '' 
      });
      setSelectedExistingItem(itemId);
    }
  };

  const categoriasFiltradas = getCategoriasFiltradas();

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gerenciamento de Selects</h1>
          <p className="text-gray-400 mt-2">Gerencie as opções dos campos de seleção do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Administrador</p>
            <p className="text-white font-medium">Controle Total</p>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Pesquisar categorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>{categoriasFiltradas.flatMap(b => b.categorias).length} categorias encontradas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Categorias</p>
                <p className="text-2xl font-bold text-white">{getAllCategorias().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Itens</p>
                <p className="text-2xl font-bold text-white">{getTotalItens()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Blocos Temáticos</p>
                <p className="text-2xl font-bold text-white">{blocosCategorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Plus className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Disponível</p>
                <p className="text-2xl font-bold text-white">Sim</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocos de Categorias */}
      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {categoriasFiltradas.map((bloco, blocoIndex) => (
            <div key={blocoIndex} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              {/* Título do Bloco */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-cyan-400 border-b-2 border-cyan-500/30 pb-2">
                  {bloco.titulo}
                </h2>
                <Badge className="bg-slate-600 text-white">
                  {bloco.categorias.length} categorias
                </Badge>
              </div>

              {/* Categorias do Bloco */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {bloco.categorias.map((categoria) => {
                  const dadosModelo = selects[categoria.nome] || { total: 0, itens: [] };
                  const isExpanded = expandedCategories[categoria.nome];
                  
                  return (
                    <Card key={categoria.nome} className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-sm font-medium">
                            {categoria.titulo}
                          </CardTitle>
                          <Badge className="bg-green-600 text-white text-xs">
                            {dadosModelo.total} itens
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-xs">Campo: {categoria.campo}</p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-2 mb-3">
                          <Button
                            onClick={() => abrirDialogAdicionar(categoria.nome)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar
                          </Button>
                          {dadosModelo.itens.length > 0 && (
                            <Button
                              onClick={() => abrirDialogEditar(categoria.nome)}
                              size="sm"
                              variant="outline"
                              className="border-slate-500 text-white hover:bg-slate-600 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                          )}
                          {dadosModelo.itens.length > 0 && (
                            <Button
                              onClick={() => toggleExpandedCategory(categoria.nome)}
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-white text-xs ml-auto"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        
                        {/* Lista de itens (oculta por padrão) */}
                        {isExpanded && dadosModelo.itens.length > 0 && (
                          <div className="mt-3 border-t border-slate-600 pt-3">
                            <p className="text-gray-400 text-xs mb-2">Itens existentes:</p>
                            <div className="space-y-2">
                              {dadosModelo.itens.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-xs bg-slate-600/50 rounded px-2 py-1">
                                  <span className="text-gray-300 truncate flex-1">{item.nome}</span>
                                  <Button
                                    onClick={() => excluirItem(categoria.nome, item)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1 h-6 ml-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para adicionar/editar item */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isAddMode ? 'Adicionar Novo Item' : 'Editar Item'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isAddMode 
                ? 'Adicione um novo item à categoria selecionada.' 
                : 'Edite as informações do item selecionado.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Categoria</Label>
              <p className="text-gray-300 text-sm mt-1">
                {getModeloTitulo(selectedModelo)}
              </p>
            </div>

            {/* Lista de opções existentes (apenas no modo editar) */}
            {!isAddMode && getItensExistentes().length > 0 && (
              <div>
                <Label className="text-white">Opções Existentes</Label>
                <Select value={selectedExistingItem} onValueChange={handleExistingItemSelect}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione uma opção existente para editar" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {getItensExistentes().map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()} className="text-white">
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-gray-400 text-xs mt-1">
                  Selecione uma opção existente para editar
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="nome" className="text-white">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Digite o nome do item"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setDialogOpen(false)}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button onClick={salvarItem} className="bg-blue-600 hover:bg-blue-700">
                {isAddMode ? 'Adicionar' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 