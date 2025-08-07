import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Building, FileText, CheckCircle, UserCheck, Settings, DollarSign, Package, Wrench, Paintbrush, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientesAPI, contratosAPI, unidadesClienteAPI, setoresUnidadeClienteAPI, aprovadoresClienteAPI, solicitantesClienteAPI, opcoesEspecCQAPI } from '../lib/api.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import LabelObrigatorio from "../components/ui/LabelObrigatorio";
import Modal from "../components/ui/Modal";

export default function GerenciarClientes() {
  const { hasGroup } = useAuth();
  const { showSuccess, showError, showLoading, dismiss } = useNotification();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [novoCliente, setNovoCliente] = useState(false);
  const [editando, setEditando] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Estados para entidades dependentes
  const [entidadesDependentes, setEntidadesDependentes] = useState({
    contratos: [],
    unidades: [],
    setores: [],
    aprovadores: [],
    solicitantes: [],
    opcoesEspecCq: []
  });
  
  // Estados para modais
  const [modalAberto, setModalAberto] = useState(null);
  const [modalData, setModalData] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    hh_valor_fabricacao: 0,
    hh_valor_levantamento: 0,
    hh_valor_servico_pintura_revestimento: 0,
    hh_valor_montagem: 0,
    hh_valor_inspecao: 0,
  });

  useEffect(() => {
    carregarClientes();
  }, []);

  // Limpar mensagem de sucesso após 3 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Verificar se usuário é administrador ou superior
  if (!hasGroup(['Administrador', 'Superior'])) {
    return (
      <div className="p-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-900/20 to-red-800/10 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">Acesso Negado</h3>
              <p className="text-gray-300">
                Apenas administradores e superiores podem gerenciar clientes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const response = await clientesAPI.list();
      setClientes(response.results || response);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarEntidadesDependentes = async (clienteId) => {
    try {
      const [contratos, unidades, aprovadores, solicitantes, opcoesCq] = await Promise.all([
        contratosAPI.list({ cliente_id: clienteId }),
        unidadesClienteAPI.list({ cliente_id: clienteId }),
        aprovadoresClienteAPI.list({ cliente_id: clienteId }),
        solicitantesClienteAPI.list({ cliente_id: clienteId }),
        opcoesEspecCQAPI.list({ cliente_id: clienteId })
      ]);

      // Carregar todos os setores do cliente
      let setores = [];
      if (unidades.results?.length > 0) {
        const setoresResponse = await setoresUnidadeClienteAPI.list({ 
          cliente_id: clienteId 
        });
        setores = setoresResponse.results || setoresResponse;
      }

      setEntidadesDependentes({
        contratos: contratos.results || contratos,
        unidades: unidades.results || unidades,
        setores: setores,
        aprovadores: aprovadores.results || aprovadores,
        solicitantes: solicitantes.results || solicitantes,
        opcoesEspecCq: opcoesCq.results || opcoesCq
      });
    } catch (error) {
      console.error('Erro ao carregar entidades dependentes:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const iniciarEdicao = async (cliente) => {
    setEditando(cliente.id);
    setClienteEditando(cliente);
    setFormData({
      nome: cliente.nome,
      hh_valor_fabricacao: cliente.hh_valor_fabricacao || 0,
      hh_valor_levantamento: cliente.hh_valor_levantamento || 0,
      hh_valor_servico_pintura_revestimento: cliente.hh_valor_servico_pintura_revestimento || 0,
      hh_valor_montagem: cliente.hh_valor_montagem || 0,
      hh_valor_inspecao: cliente.hh_valor_inspecao || 0,
    });
    await carregarEntidadesDependentes(cliente.id);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setNovoCliente(false);
    setClienteEditando(null);
    setFormData({
      nome: '',
      hh_valor_fabricacao: 0,
      hh_valor_levantamento: 0,
      hh_valor_servico_pintura_revestimento: 0,
      hh_valor_montagem: 0,
      hh_valor_inspecao: 0,
    });
    setEntidadesDependentes({
      contratos: [],
      unidades: [],
      setores: [],
      aprovadores: [],
      solicitantes: [],
      opcoesEspecCq: []
    });
  };

  const salvarCliente = async () => {
    const loadingToast = showLoading('Salvando cliente...');
    
    try {
      if (novoCliente) {
        await clientesAPI.create(formData);
        dismiss(loadingToast);
        showSuccess('Cliente criado com sucesso!');
        setSuccessMessage('Cliente criado com sucesso!');
      } else {
        await clientesAPI.update(editando, formData);
        dismiss(loadingToast);
        showSuccess('Cliente atualizado com sucesso!');
        setSuccessMessage('Cliente atualizado com sucesso!');
      }
      await carregarClientes();
      cancelarEdicao();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      dismiss(loadingToast);
      showError('Erro ao salvar cliente. Verifique os dados e tente novamente.');
    }
  };

  const excluirCliente = async (id) => {
    // Verificar se usuário é administrador para exclusão
    if (!hasGroup('Administrador')) {
      showError('Apenas administradores podem excluir clientes.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      const loadingToast = showLoading('Excluindo cliente...');
      
      try {
        await clientesAPI.delete(id);
        await carregarClientes();
        dismiss(loadingToast);
        showSuccess('Cliente excluído com sucesso!');
        setSuccessMessage('Cliente excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        dismiss(loadingToast);
        showError('Erro ao excluir cliente.');
      }
    }
  };

  const iniciarNovoCliente = () => {
    setNovoCliente(true);
    setFormData({
      nome: '',
      hh_valor_fabricacao: 0,
      hh_valor_levantamento: 0,
      hh_valor_servico_pintura_revestimento: 0,
      hh_valor_montagem: 0,
      hh_valor_inspecao: 0,
    });
  };

  // Funções para gerenciar entidades dependentes
  const abrirModal = (tipo, dados = {}) => {
    setModalAberto(tipo);
    setModalData(dados);
  };

  const fecharModal = () => {
    setModalAberto(null);
    setModalData({});
  };

  const salvarEntidade = async () => {
    if (!clienteEditando) return;
    
    try {
      setModalLoading(true);
      const apiMap = {
        contrato: contratosAPI,
        unidade: unidadesClienteAPI,
        setor: setoresUnidadeClienteAPI,
        aprovador: aprovadoresClienteAPI,
        solicitante: solicitantesClienteAPI,
        opcaoCq: opcoesEspecCQAPI
      };

      const api = apiMap[modalAberto];
      if (!api) return;

      const dados = {
        ...modalData,
        cliente: clienteEditando.id
      };

      // Para setores, garantir que a unidade seja enviada
      if (modalAberto === 'setor') {
        if (!modalData.unidade) {
          showError('Por favor, selecione uma unidade para o setor.');
          return;
        }
        
        // Verificar se há unidades disponíveis
        if (entidadesDependentes.unidades.length === 0) {
          showError('Não é possível criar setores sem unidades. Por favor, cadastre uma unidade primeiro.');
          return;
        }
        
        dados.unidade = modalData.unidade;
      }

      if (modalData.id) {
        await api.update(modalData.id, dados);
        showSuccess('Item atualizado com sucesso!');
      } else {
        await api.create(dados);
        showSuccess('Item criado com sucesso!');
      }

      await carregarEntidadesDependentes(clienteEditando.id);
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar entidade:', error);
      showError('Erro ao salvar. Verifique os dados e tente novamente.');
    } finally {
      setModalLoading(false);
    }
  };

  const excluirEntidade = async (tipo, id) => {
    // Verificar se usuário é administrador para exclusão
    if (!hasGroup('Administrador')) {
      showError('Apenas administradores podem excluir itens.');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    
    try {
      const apiMap = {
        contrato: contratosAPI,
        unidade: unidadesClienteAPI,
        setor: setoresUnidadeClienteAPI,
        aprovador: aprovadoresClienteAPI,
        solicitante: solicitantesClienteAPI,
        opcaoCq: opcoesEspecCQAPI
      };

      const api = apiMap[tipo];
      if (!api) return;

      await api.delete(id);
      await carregarEntidadesDependentes(clienteEditando.id);
      showSuccess('Item excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir entidade:', error);
      showError('Erro ao excluir item.');
    }
  };

  // Função para agrupar setores por unidade
  const agruparSetoresPorUnidade = (setores, unidades) => {
    const grupos = {};
    
    // Inicializar grupos com todas as unidades
    unidades.forEach(unidade => {
      grupos[unidade.id] = {
        unidade: unidade,
        setores: []
      };
    });
    
    // Distribuir setores pelos grupos
    setores.forEach(setor => {
      if (grupos[setor.unidade]) {
        grupos[setor.unidade].setores.push(setor);
      }
    });
    
    return Object.values(grupos);
  };

  const renderEntidadeList = (tipo, entidades, titulo, icone) => {
    if (tipo === 'setor') {
      const gruposSetores = agruparSetoresPorUnidade(entidades, entidadesDependentes.unidades);
      
      return (
        <Card className="bg-slate-800/50 border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    {icone}
                  </div>
                  <h4 className="font-semibold text-gray-100 text-lg">{titulo}</h4>
                </div>
                <Button
                  size="sm"
                  onClick={() => abrirModal(tipo)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={entidadesDependentes.unidades.length === 0}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-4">
                {gruposSetores.map((grupo) => (
                  <div key={grupo.unidade.id} className="border border-slate-600/50 rounded-xl p-4 bg-slate-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-cyan-400 text-sm flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {grupo.unidade.nome}
                      </h5>
                      <Badge variant="secondary" className="text-xs bg-cyan-600/20 text-cyan-300 border-cyan-500/30">
                        {grupo.setores.length} setor{grupo.setores.length !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {grupo.setores.map((setor) => (
                        <div key={setor.id} className="flex items-center justify-between bg-slate-600/30 p-3 rounded-lg hover:bg-slate-600/50 transition-colors duration-200">
                          <span className="text-sm text-gray-200 font-medium">{setor.nome}</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => abrirModal(tipo, setor)}
                              className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => excluirEntidade(tipo, setor.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {grupo.setores.length === 0 && (
                        <p className="text-sm text-gray-500 italic text-center py-2">Nenhum setor cadastrado</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {gruposSetores.length === 0 && (
                  <p className="text-sm text-gray-500 italic text-center py-4">Nenhuma unidade cadastrada</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-slate-800/50 border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  {icone}
                </div>
                <h4 className="font-semibold text-gray-100 text-lg">{titulo}</h4>
              </div>
              <Button
                size="sm"
                onClick={() => abrirModal(tipo)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-2">
              {entidades.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-600/30 p-3 rounded-lg hover:bg-slate-600/50 transition-colors duration-200">
                  <span className="text-sm text-gray-200 font-medium">{item.nome || item.numero}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirModal(tipo, item)}
                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => excluirEntidade(tipo, item.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {entidades.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">Nenhum item cadastrado</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderModalForm = () => {
    const campos = {
      contrato: [
        { name: 'numero', label: 'Número do Contrato', required: true },
      ],
      unidade: [
        { name: 'nome', label: 'Nome da Unidade', required: true },
      ],
      setor: [
        { name: 'nome', label: 'Nome do Setor', required: true },
        { name: 'unidade', label: 'Unidade', required: true, type: 'select' },
      ],
      aprovador: [
        { name: 'nome', label: 'Nome do Aprovador', required: true },
      ],
      solicitante: [
        { name: 'nome', label: 'Nome do Solicitante', required: true },
      ],
      opcaoCq: [
        { name: 'nome', label: 'Nome da Opção', required: true },
      ]
    };

    const titulos = {
      contrato: 'Contrato',
      unidade: 'Unidade',
      setor: 'Setor',
      aprovador: 'Aprovador',
      solicitante: 'Solicitante',
      opcaoCq: 'Opção Especial CQ'
    };

    return (
      <Modal
        isOpen={!!modalAberto}
        onClose={fecharModal}
        title={`${modalData.id ? 'Editar' : 'Novo'} ${titulos[modalAberto]}`}
        onSave={salvarEntidade}
        isLoading={modalLoading}
      >
        <div className="space-y-6">
          {campos[modalAberto]?.map((campo) => (
            <div key={campo.name} className="space-y-2">
              <LabelObrigatorio obrigatorio={campo.required} htmlFor={campo.name} className="text-gray-100 font-medium">
                {campo.label}
              </LabelObrigatorio>
              
              {campo.type === 'select' ? (
                <Select
                  value={modalData[campo.name] || ''}
                  onValueChange={(value) => setModalData(prev => ({ ...prev, [campo.name]: value }))}
                >
                  <SelectTrigger className="bg-slate-800 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-colors duration-200 h-12 rounded-lg">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-600">
                    {entidadesDependentes.unidades.length > 0 ? (
                      entidadesDependentes.unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id.toString()}>
                          {unidade.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Nenhuma opção disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={campo.name}
                  value={modalData[campo.name] || ''}
                  onChange={(e) => setModalData(prev => ({ ...prev, [campo.name]: e.target.value }))}
                  className="bg-slate-800 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-colors duration-200 h-12 rounded-lg placeholder:text-gray-500"
                  placeholder={`Digite ${campo.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header com título e botão */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Gerenciar Clientes
          </h1>
          <p className="text-gray-400 mt-1">Gerencie os clientes e suas configurações</p>
        </div>
        <Button 
          onClick={iniciarNovoCliente} 
          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-300 font-medium">{successMessage}</span>
        </div>
      )}

      {/* Formulário de criação/edição */}
      {(novoCliente || editando) && (
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
              {novoCliente ? 'Novo Cliente' : 'Editar Cliente'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Informações básicas */}
            <div className="space-y-4">
              <div>
                <LabelObrigatorio obrigatorio={true} htmlFor="nome" className="text-gray-100 font-semibold text-lg">
                  Nome do Cliente
                </LabelObrigatorio>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl placeholder:text-gray-500 text-lg"
                />
              </div>
            </div>

            {/* Valores HH */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100">Valores HH por Serviço</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <LabelObrigatorio obrigatorio={true} htmlFor="hh_valor_fabricacao" className="text-gray-100 font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    Valor HH Fabricação
                  </LabelObrigatorio>
                  <Input
                    id="hh_valor_fabricacao"
                    type="number"
                    step="0.01"
                    value={formData.hh_valor_fabricacao}
                    onChange={(e) => handleInputChange('hh_valor_fabricacao', parseFloat(e.target.value) || 0)}
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl placeholder:text-gray-500"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <LabelObrigatorio obrigatorio={true} htmlFor="hh_valor_levantamento" className="text-gray-100 font-medium flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-green-400" />
                    Valor HH Levantamento
                  </LabelObrigatorio>
                  <Input
                    id="hh_valor_levantamento"
                    type="number"
                    step="0.01"
                    value={formData.hh_valor_levantamento}
                    onChange={(e) => handleInputChange('hh_valor_levantamento', parseFloat(e.target.value) || 0)}
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl placeholder:text-gray-500"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <LabelObrigatorio obrigatorio={true} htmlFor="hh_valor_servico_pintura_revestimento" className="text-gray-100 font-medium flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-purple-400" />
                    Valor HH Pintura/Revestimento
                  </LabelObrigatorio>
                  <Input
                    id="hh_valor_servico_pintura_revestimento"
                    type="number"
                    step="0.01"
                    value={formData.hh_valor_servico_pintura_revestimento}
                    onChange={(e) => handleInputChange('hh_valor_servico_pintura_revestimento', parseFloat(e.target.value) || 0)}
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl placeholder:text-gray-500"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <LabelObrigatorio obrigatorio={true} htmlFor="hh_valor_montagem" className="text-gray-100 font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4 text-orange-400" />
                    Valor HH Montagem
                  </LabelObrigatorio>
                  <Input
                    id="hh_valor_montagem"
                    type="number"
                    step="0.01"
                    value={formData.hh_valor_montagem}
                    onChange={(e) => handleInputChange('hh_valor_montagem', parseFloat(e.target.value) || 0)}
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl placeholder:text-gray-500"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <LabelObrigatorio obrigatorio={true} htmlFor="hh_valor_inspecao" className="text-gray-100 font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-red-400" />
                    Valor HH Inspeção
                  </LabelObrigatorio>
                  <Input
                    id="hh_valor_inspecao"
                    type="number"
                    step="0.01"
                    value={formData.hh_valor_inspecao}
                    onChange={(e) => handleInputChange('hh_valor_inspecao', parseFloat(e.target.value) || 0)}
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl placeholder:text-gray-500"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            {/* Entidades Dependentes */}
            {editando && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Settings className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-100">Entidades Dependentes</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderEntidadeList('contrato', entidadesDependentes.contratos, 'Contratos', <FileText className="w-4 h-4" />)}
                  {renderEntidadeList('unidade', entidadesDependentes.unidades, 'Unidades', <Building className="w-4 h-4" />)}
                  {renderEntidadeList('setor', entidadesDependentes.setores, 'Setores', <Settings className="w-4 h-4" />)}
                  {renderEntidadeList('aprovador', entidadesDependentes.aprovadores, 'Aprovadores', <UserCheck className="w-4 h-4" />)}
                  {renderEntidadeList('solicitante', entidadesDependentes.solicitantes, 'Solicitantes', <Users className="w-4 h-4" />)}
                  {renderEntidadeList('opcaoCq', entidadesDependentes.opcoesEspecCq, 'Opções de Espec', <CheckCircle className="w-4 h-4" />)}
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-600/50">
              <Button 
                onClick={salvarCliente} 
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 rounded-xl flex-1 sm:flex-none"
              >
                <Save className="w-5 h-5 mr-2" />
                Salvar Cliente
              </Button>
              <Button 
                variant="destructive" 
                onClick={cancelarEdicao} 
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 rounded-xl flex-1 sm:flex-none"
              >
                <X className="w-5 h-5 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listagem de clientes */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Clientes Cadastrados</h2>
        
        <div className="grid gap-6">
          {clientes.map((cliente) => (
            <Card key={cliente.id} className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <Building className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text">
                        {cliente.nome}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300">Fabricação:</span>
                        <span className="text-sm font-semibold text-blue-400">R$ {cliente.hh_valor_fabricacao || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                        <Wrench className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300">Levantamento:</span>
                        <span className="text-sm font-semibold text-green-400">R$ {cliente.hh_valor_levantamento || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                        <Paintbrush className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300">Pintura:</span>
                        <span className="text-sm font-semibold text-purple-400">R$ {cliente.hh_valor_servico_pintura_revestimento || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                        <Settings className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-gray-300">Montagem:</span>
                        <span className="text-sm font-semibold text-orange-400">R$ {cliente.hh_valor_montagem || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                        <Eye className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-gray-300">Inspeção:</span>
                        <span className="text-sm font-semibold text-red-400">R$ {cliente.hh_valor_inspecao || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      onClick={() => iniciarEdicao(cliente)}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 px-6 py-2 rounded-lg"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => excluirCliente(cliente.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all duration-300 px-6 py-2 rounded-lg"
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

        {clientes.length === 0 && (
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-gray-500">Comece criando seu primeiro cliente para gerenciar suas configurações.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {renderModalForm()}
    </div>
  );
}

