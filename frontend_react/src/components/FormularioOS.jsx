import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateOrdemServico, useUpdateOrdemServico } from '../hooks/useOS.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, 
  Calculator, 
  AlertCircle,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import { osAPI, getDadosCliente } from '../lib/api.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import FormsetField from './FormsetField.jsx';
import BlocoFormulario from './BlocoFormulario.jsx';
import AccordionFormset from './AccordionFormset.jsx';
import { formsetConfigs } from './formsets/FormsetConfigs.js';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { getFriendlyErrorMessage } from '../lib/errorTranslator.js';
import { formatCurrency, parseCurrency, formatCurrencyInput, formatWeightInput, parseWeight, formatSquareMeterInput, parseSquareMeter } from '../lib/currencyUtils.js';
import { toDatetimeLocal, fromDatetimeLocal } from '../lib/dateUtils.js';
import BackToTopButton from '@/components/ui/BackToTopButton';

// Função utilitária para normalizar texto (remover acentos, espaços e converter para maiúsculo)
function normalizeText(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '').toUpperCase();
}

function isFieldRequired({
  field,
  grupo,
  values,
  opcoes = {}
}) {
  if (grupo === 'Administrador' || grupo === 'Superior') {
    return false;
  }
  // Para grupo Qualidade, só campos do bloco 6 são obrigatórios
  if (grupo === 'Qualidade') {
    const camposQualidade = [
      'controles',
      'tipo_cq',
      'opcoes_espec_cq',
      'nivel_inspecao_cq',
      'tipo_ensaio_cq',
      'percentual_cq',
      'quantidade_cq',
      'tamanho_cq',
      'texto_tamanho_cq',
    ];
    return camposQualidade.includes(field);
  }
  // Bloco 1
  if ([
    'data_solicitacao_os',
    'data_emissao_os',
    'documentos_solicitacao',
    'tipo_documento_solicitacao',
    'documento_solicitacao'
  ].includes(field)) {
    return grupo === 'Básico';
  }
  // Bloco 2
  if ([
    'nome_cliente',
    'numero_contrato',
    'unidade_cliente',
    'setor_unidade_cliente'
  ].includes(field)) {
    return grupo === 'Básico';
  }
  // Bloco 3
  if ([
    'datas_previstas',
    'data_prevista_entrega',
    'descricao', // <-- Torna obrigatório para grupo Básico
    'prazo_execucao_servico',
    'status_regime_os'
  ].includes(field)) {
    return grupo === 'Básico';
  }
  // Bloco 4
  if ([
    'nome_diligenciador_os',
    'nome_solicitante_cliente',
    'nome_responsavel_aprovacao_os_cliente',
    'nome_responsavel_execucao_servico'
  ].includes(field)) {
    return grupo === 'Básico';
  }
  // Bloco 5
  if ([
    'acoes_solicitacao',
    'acao_solicitacao',
    'id_demanda',
    'descricao_resumida'
  ].includes(field)) {
    return grupo === 'Básico';
  }
  // Bloco 7: Detalhes de Orçamento
  if (field === 'existe_orcamento') {
    return grupo === 'Básico';
  }
  // Novos: obrigatoriedade dos campos havera_valor_*
  if ([
    'havera_valor_fabricacao',
    'havera_valor_levantamento',
    'havera_valor_material_fabricacao',
    'havera_valor_material_pintura',
    'havera_valor_servico_pintura_revestimento',
    'havera_valor_montagem',
    'havera_valor_material_montagem',
    'havera_valor_inspecao',
    // 'havera_valor_hh',
    'havera_valor_manutencao_valvula',
    'havera_valor_servico_terceiros',
  ].includes(field)) {
    return grupo === 'Básico' && values.existe_orcamento === 'SIM';
  }
  // Os campos valor_* só são obrigatórios se o respectivo havera_valor_* for 'SIM'
  if ([
    'valor_fabricacao',
    'valor_levantamento',
    'valor_material_fabricacao',
    'valor_material_pintura',
    'valor_servico_pintura_revestimento',
    'valor_material_montagem',
    'valor_montagem',
    'valor_inspecao',
    // 'valor_hh',
    'valor_manutencao_valvula',
    'valor_servico_terceiros',
  ].includes(field)) {
    const map = {
      valor_fabricacao: 'havera_valor_fabricacao',
      valor_levantamento: 'havera_valor_levantamento',
      valor_material_fabricacao: 'havera_valor_material_fabricacao',
      valor_material_pintura: 'havera_valor_material_pintura',
      valor_servico_pintura_revestimento: 'havera_valor_servico_pintura_revestimento',
      valor_material_montagem: 'havera_valor_material_montagem',
      valor_montagem: 'havera_valor_montagem',
      valor_inspecao: 'havera_valor_inspecao',
      // valor_hh: 'havera_valor_hh',
      valor_manutencao_valvula: 'havera_valor_manutencao_valvula',
      valor_servico_terceiros: 'havera_valor_servico_terceiros',
    };
    return grupo === 'Básico' && values.existe_orcamento === 'SIM' && values[map[field]] === 'SIM';
  }
  // peso_fabricacao e metro_quadrado_pintura_revestimento obrigatórios se existe_orcamento == 'SIM'
  if ([
    'peso_fabricacao',
    'metro_quadrado_pintura_revestimento',
  ].includes(field)) {
    return grupo === 'Básico' && values.existe_orcamento === 'SIM';
  }
  // Bloco 8: Assinatura
  if (field === 'status_os') {
    return grupo === 'Básico';
  }
  
  // Verificar se o status é "Cancelada" - se sim, todos os campos dos blocos 9-14 são opcionais
  const isStatusCanceladaValue = isStatusCancelada(values.status_os, opcoes);
  if (isStatusCanceladaValue) {
    // Se o status é "Cancelada", todos os campos dos blocos 9-14 são opcionais para todos os grupos
    return false;
  }
  
  if ([
    'status_os_manual',
    'status_os_eletronica'
  ].includes(field)) {
    // Verificar se o status é finalizador usando a nova função
    const isStatusFinalizadorValue = isStatusFinalizador(values.status_os, opcoes);
    return grupo === 'Básico' && isStatusFinalizadorValue;
  }
  
  if (field === 'data_aprovacao_assinatura_manual') {
    const isStatusFinalizadorValue = isStatusFinalizador(values.status_os, opcoes);
    // Verificar se o status manual é "APROVADO" usando a função com variações
    const isStatusManualAprovado = isStatusAprovado(values.status_os_manual, opcoes.status_os_manual);
    return grupo === 'Básico' && isStatusFinalizadorValue && isStatusManualAprovado;
  }
  
  if ([
    'data_assinatura_eletronica_os',
    'numero_os_eletronica'
  ].includes(field)) {
    const isStatusFinalizadorValue = isStatusFinalizador(values.status_os, opcoes);
    // Verificar se o status eletrônico é "APROVADO" usando a função com variações
    const isStatusEletronicaAprovado = isStatusAprovado(values.status_os_eletronica, opcoes.status_os_eletronica);
    return grupo === 'Básico' && isStatusFinalizadorValue && isStatusEletronicaAprovado;
  }
  
  if ([
    'ordens_cliente',
    'ordens',
    'numero_ordem',
    'documentos_entrada',
    'documentos',
    'documento_entrada',
    'numero_documento_entrada',
    'data_documento_entrada'
  ].includes(field)) {
    // Verificar se o status é finalizador usando a nova função
    const isStatusFinalizadorValue = isStatusFinalizador(values.status_os, opcoes);
    return grupo === 'Básico' && isStatusFinalizadorValue;
  }
  // Bloco 9: Levantamento e Material
  if ([
    'status_levantamento',
    'status_producao'
  ].includes(field)) {
    return grupo === 'Básico';
  }
  if ([
    'levantamentos',
    'data_levantamento',
    'descricao_levantamento',
    'arquivo_anexo_levantamento'
  ].includes(field)) {
    // Depende apenas do status_levantamento ser 'CONCLUIDO' ou 'EM ANDAMENTO'
    const statusLevantamentoAtivo = isStatusConcluido(values.status_levantamento, opcoes, 'levantamento');
    return grupo === 'Básico' && statusLevantamentoAtivo;
  }
  if ([
    'materiais',
    'tipo_material',
    'status_material',
    'responsavel_material'
  ].includes(field)) {
    // Depende apenas do status_producao ser 'CONCLUIDO' ou 'EM ANDAMENTO'
    const statusProducaoAtivo = isStatusConcluido(values.status_producao, opcoes, 'producao');
    return grupo === 'Básico' && statusProducaoAtivo;
  }
  // Bloco 10: GMI/RTIP obrigatórios
  if (field === 'gmis' || field === 'rtips') {
    return grupo === 'Básico';
  }
  if ([
    'data_gmi', 'descricao_gmi', 'arquivo_anexo_gmi'
  ].includes(field)) {
    return grupo === 'Básico' && values.gmis !== undefined;
  }
  if ([
    'data_rtip', 'descricao_rtip', 'arquivo_anexo_rtip'
  ].includes(field)) {
    return grupo === 'Básico' && values.rtips !== undefined;
  }
  // GME e RTM não obrigatórios
  // Bloco 11: DMS
  if (field === 'opcoes_dms') {
    return grupo === 'Básico';
  }
  if ([
    'dmss'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_dms === 'SIM';
  }
  if ([
    'dms', 'status_dms', 'numero_dms', 'data_aprovacao_dms'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_dms === 'SIM';
  }
  // Bloco 12: BMS
  if (field === 'opcoes_bms') {
    return grupo === 'Básico';
  }
  if ([
    'bmss'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_bms === 'SIM';
  }
  if ([
    'bms', 'status_bms', 'numero_bms', 'data_aprovacao_bms'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_bms === 'SIM';
  }
  // Bloco 13: FRS
  if (field === 'opcoes_frs') {
    return grupo === 'Básico';
  }
  if ([
    'frss'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_frs === 'SIM';
  }
  if ([
    'frs', 'status_frs', 'numero_frs', 'data_aprovacao_frs'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_frs === 'SIM';
  }
  // Bloco 14: Notas Fiscais
  if (field === 'opcoes_nf') {
    return grupo === 'Básico';
  }
  if ([
    'nfsaidas'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_nf === 'SIM';
  }
  if ([
    'nfvendas'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_nf === 'SIM';
  }
  if ([
    'notas_fiscais_saida', 'numero_nota_fiscal_remessa_saida', 'arquivo_anexo_nota_fiscal_remessa_saida', 'data_nota_fiscal_remessa_saida',
    'notas_fiscais_venda', 'numero_nota_fiscal_venda', 'preco_nota_fiscal_venda', 'arquivo_anexo_nota_fiscal_venda', 'data_nota_fiscal_venda'
  ].includes(field)) {
    return grupo === 'Básico' && values.opcoes_nf === 'SIM';
  }
  // Bloco 15: Observações e Saldo
  if ([
    'saldo_final', 'observacao', 'soma_notas_fiscais'
  ].includes(field)) {
    return false; // Campos opcionais
  }
  
  // Verificação para campos dos formsets que podem não ter sido encontrados nas verificações específicas
  // Campos dos formsets são obrigatórios para grupo Básico
  if (grupo === 'Básico') {
    // Campos específicos dos formsets
    const formsetFields = [
      'tipo_documento_solicitacao', 'documento_solicitacao',
      'data_prevista_entrega',
      'acao_solicitacao'
    ];
    if (formsetFields.includes(field)) {
      return true;
    }
    
    // Campos dos formsets que dependem do status da OS
    const osApprovedFields = [
      'numero_ordem',
      'documento_entrada', 'numero_documento_entrada', 'data_documento_entrada'
    ];
    if (osApprovedFields.includes(field)) {
      // Verificar se o status é finalizador usando a nova função
      const isStatusFinalizadorValue = isStatusFinalizador(values.status_os, opcoes);
      return isStatusFinalizadorValue;
    }
  }
  
  return false;
}


function toIsoDatetime(value) {
  return fromDatetimeLocal(value);
}

// Lista de status que indicam finalização da OS
// Nota: A função normalizeText remove acentos e converte para maiúsculas
const STATUS_FINALIZADORES = [
  'APROVADA', 'APROVADO',
  'CONCLUIDA', 'CONCLUIDO',
  'FINALIZADA', 'FINALIZADO',
  'TERMINADA', 'TERMINADO',
  'COMPLETADA', 'COMPLETADO'
];

// Função para verificar se um status é finalizador
function isStatusFinalizador(statusValue, opcoes = {}) {
  if (!statusValue) return false;
  
  let statusNome = '';
  
  // Se o valor é um ID, buscar o status correspondente
  if (typeof statusValue === 'number' || (typeof statusValue === 'string' && !isNaN(parseInt(statusValue)))) {
    const statusId = parseInt(statusValue);
    const status = opcoes.status_os?.find(s => s.id === statusId);
    statusNome = status ? status.nome : '';
  } else if (typeof statusValue === 'string') {
    statusNome = statusValue;
  }
  
  if (!statusNome) return false;
  
  // Normalizar o nome do status para comparação
  const normalizedStatus = normalizeText(statusNome);
  
  // Verificar se está na lista de status finalizadores
  return STATUS_FINALIZADORES.includes(normalizedStatus);
}

// Função para verificar se um status permite ordens e documentos (finalizador OU em andamento)
function isStatusPermiteOrdensDocumentos(statusValue, opcoes = {}) {
  if (!statusValue) return false;
  
  let statusNome = '';
  
  // Se o valor é um ID, buscar o status correspondente
  if (typeof statusValue === 'number' || (typeof statusValue === 'string' && !isNaN(parseInt(statusValue)))) {
    const statusId = parseInt(statusValue);
    const status = opcoes.status_os?.find(s => s.id === statusId);
    statusNome = status ? status.nome : '';
  } else if (typeof statusValue === 'string') {
    statusNome = statusValue;
  }
  
  if (!statusNome) return false;
  
  // Normalizar o nome do status para comparação
  const normalizedStatus = normalizeText(statusNome);
  
  // Verificar se é um status finalizador OU "Em andamento"
  return STATUS_FINALIZADORES.includes(normalizedStatus) || 
         STATUS_EM_ANDAMENTO_VARIACOES.includes(normalizedStatus);
}

// Lista de variações de status "Aprovada"
// Nota: A função normalizeText converte para maiúsculas
const STATUS_APROVADA_VARIACOES = [
  'APROVADA', // Versão normalizada de todas as variações
  'APROVADO'  // Versão masculina normalizada
];

// Função auxiliar para verificar se um status é "Aprovado" (para status manual e eletrônico)
function isStatusAprovado(statusValue, opcoesArray = []) {
  if (!statusValue) return false;
  
  // Se o valor é um ID, buscar o status correspondente
  if (typeof statusValue === 'number' || (typeof statusValue === 'string' && !isNaN(parseInt(statusValue)))) {
    const statusId = parseInt(statusValue);
    const status = opcoesArray?.find(s => s.id === statusId);
    if (!status) return false;
    const normalizedStatusName = normalizeText(status.nome);
    return STATUS_APROVADA_VARIACOES.includes(normalizedStatusName);
  }
  
  // Se o valor é uma string, verificar diretamente
  if (typeof statusValue === 'string') {
    const normalizedStatusValue = normalizeText(statusValue);
    return STATUS_APROVADA_VARIACOES.includes(normalizedStatusValue);
  }
  
  return false;
}

// Função auxiliar para verificar se um status é "Aprovada" baseado no texto normalizado
// Mantida para compatibilidade com código existente
function _isStatusAprovado(statusValue, opcoes = {}) {
  if (!statusValue) return false;
  
  // Se o valor é um ID, buscar o status correspondente
  if (typeof statusValue === 'number' || (typeof statusValue === 'string' && !isNaN(parseInt(statusValue)))) {
    const statusId = parseInt(statusValue);
    const status = opcoes.status_os?.find(s => s.id === statusId);
    if (!status) return false;
    const normalizedStatusName = normalizeText(status.nome);
    return STATUS_APROVADA_VARIACOES.includes(normalizedStatusName);
  }
  
  // Se o valor é uma string, verificar diretamente
  if (typeof statusValue === 'string') {
    const normalizedStatusValue = normalizeText(statusValue);
    return STATUS_APROVADA_VARIACOES.includes(normalizedStatusValue);
  }
  
  return false;
}

// Lista de variações de status "Cancelada"
// Nota: A função normalizeText converte para maiúsculas
const STATUS_CANCELADA_VARIACOES = [
  'CANCELADA', // Versão normalizada de todas as variações
  'CANCELADO'  // Versão masculina normalizada
];

// Função auxiliar para verificar se um status é "Cancelada" baseado no texto normalizado
function isStatusCancelada(statusValue, opcoes = {}) {
  if (!statusValue) return false;
  
  // Se o valor é um ID, buscar o status correspondente
  if (typeof statusValue === 'number' || (typeof statusValue === 'string' && !isNaN(parseInt(statusValue)))) {
    const statusId = parseInt(statusValue);
    const status = opcoes.status_os?.find(s => s.id === statusId);
    if (!status) return false;
    const normalizedStatusName = normalizeText(status.nome);
    return STATUS_CANCELADA_VARIACOES.includes(normalizedStatusName);
  }
  
  // Se o valor é uma string, verificar diretamente
  if (typeof statusValue === 'string') {
    const normalizedStatusValue = normalizeText(statusValue);
    return STATUS_CANCELADA_VARIACOES.includes(normalizedStatusValue);
  }
  
  return false;
}

// Lista completa de variações de status "Em andamento" baseada no backend
// Nota: A função normalizeText remove espaços e converte para maiúsculas
// Todas as variações de "Em andamento" são normalizadas para "EMANDAMENTO"
const STATUS_EM_ANDAMENTO_VARIACOES = [
  'EMANDAMENTO', // Versão normalizada de todas as variações
  'APROVADA', 'APROVADO', 'Aprovada', 'Aprovado',
  'aprovada', 'aprovado'
];

// Lista de status "Concluído" para compatibilidade
// Nota: A função normalizeText remove acentos e converte para maiúsculas
const STATUS_CONCLUIDO_VARIACOES = [
  'CONCLUIDO', // Versão normalizada de todas as variações
  'CONCLUIDA'  // Versão feminina normalizada
];

// Função auxiliar para verificar se um status é "CONCLUIDO" ou "EM ANDAMENTO" baseado no texto normalizado
function isStatusConcluido(statusValue, opcoes, tipoStatus = 'levantamento') {
  if (!statusValue) return false;
  
  // Determinar qual array de opções usar
  let opcoesArray;
  switch (tipoStatus) {
    case 'levantamento':
      opcoesArray = opcoes.status_levantamento;
      break;
    case 'producao':
      opcoesArray = opcoes.status_producao;
      break;
    default:
      opcoesArray = opcoes.status_levantamento;
  }
  
  // Se o valor é um ID, buscar o status correspondente
  if (typeof statusValue === 'number' || (typeof statusValue === 'string' && !isNaN(parseInt(statusValue)))) {
    const statusId = parseInt(statusValue);
    const status = opcoesArray?.find(s => s.id === statusId);
    if (!status) return false;
    const normalizedStatusName = normalizeText(status.nome);
    
    // Verificar se é um status "Em andamento" ou "Concluído"
    return STATUS_EM_ANDAMENTO_VARIACOES.includes(normalizedStatusName) || 
           STATUS_CONCLUIDO_VARIACOES.includes(normalizedStatusName);
  }
  
  // Se o valor é uma string, verificar diretamente
  if (typeof statusValue === 'string') {
    const normalizedStatusValue = normalizeText(statusValue);
    
    // Verificar se é um status "Em andamento" ou "Concluído"
    return STATUS_EM_ANDAMENTO_VARIACOES.includes(normalizedStatusValue) || 
           STATUS_CONCLUIDO_VARIACOES.includes(normalizedStatusValue);
  }
  
  return false;
}


// Função auxiliar para verificar se um campo de arquivo está preenchido
function isFileFieldValid(value) {
  if (!value) return false;
  
  // Se é um File object (novo arquivo), é válido
  if (value instanceof File) return true;
  
  // Se é uma string (URL de arquivo existente), é válido
  if (typeof value === 'string' && value.trim() !== '') return true;
  
  return false;
}

function validateField(fieldName, value, grupo) {
  // Validação básica de campos obrigatórios
  const requiredFields = [
    'data_solicitacao_os', 'data_emissao_os', 'nome_cliente', 'numero_contrato',
    'unidade_cliente', 'setor_unidade_cliente', 'prazo_execucao_servico',
    'status_regime_os', 'nome_diligenciador_os', 'nome_responsavel_execucao_servico',
    'id_demanda', 'descricao_resumida', 'status_os', 'status_os_manual', 'status_os_eletronica',
    'status_levantamento', 'status_producao', 'opcoes_dms', 'opcoes_bms', 'opcoes_frs'
  ];
  
  if (grupo === 'Básico' && requiredFields.includes(fieldName)) {
    // Validação especial para campos de seleção que podem ter valores válidos como string
    if (['numero_contrato', 'unidade_cliente', 'setor_unidade_cliente'].includes(fieldName)) {
      // Para campos de seleção, considerar válido se for string não vazia
      if (!value || value === '' || value === 'undefined' || value === 'null') {
        return { isValid: false, error: `${fieldName} é obrigatório` };
      }
      // Se o valor é uma string não vazia, considerar válido
      if (typeof value === 'string' && value.trim() !== '') {
        return { isValid: true, error: null };
      }
      // Se o valor é um número (ID), considerar válido
      if (typeof value === 'number' && value > 0) {
        return { isValid: true, error: null };
      }
      // Se o valor é uma string que representa um número, considerar válido
      if (typeof value === 'string' && !isNaN(parseInt(value)) && parseInt(value) > 0) {
        return { isValid: true, error: null };
      }
      // Se chegou até aqui, o valor não é válido
      return { isValid: false, error: `${fieldName} é obrigatório` };
    }
    
    // Para outros campos, validação normal
    if (!value || value === '' || value === 'undefined' || value === 'null') {
      return { isValid: false, error: `${fieldName} é obrigatório` };
    }
  }
  
  return { isValid: true, error: null };
}

const schema = yup.object().shape({
  // Schema vazio para permitir submit sem validações que podem estar causando problemas
});

export default function FormularioOS({ osId = null, onSave, onCancel }) {
  const { getUserMainGroup } = useAuth();
  const { showSuccess, showError, showLoading, dismiss } = useNotification();
  const grupo = getUserMainGroup();

  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [globalError, setGlobalError] = useState('');
  const formRef = useRef();
  const [opcoes, setOpcoes] = useState({
    contratos: [],
    unidades: [],
    setores: [],
    tipos_cq: [],
    especs_cq: [],
    niveis_cq: [],
    ensaios_cq: [],
    clientes: [],
    status_levantamento: [],
    status_producao: [],
    tiposDocumento: [],
    acoes: [],
    percentuais: [],
    tiposMaterial: [],
    statusMaterial: [],
    responsaveisMaterial: [],
    statusDMS: [],
    statusBMS: [],
    statusFRS: [],
    statusOS: []
  });
  const [opcoesDinamicas, setOpcoesDinamicas] = useState({
    pessoas: [],
    acoes: [],
    demandas: [],
    percentuais: [],
    tiposMaterial: [],
    statusMaterial: [],
    statusDMS: [],
    statusBMS: [],
    statusFRS: [],
    tiposCQ: [],
    niveisCQ: [],
    ensaiosCQ: [],
    responsaveisMaterial: [],
    statusLevantamento: [],
    statusProducao: [],
  });
  const [responsaveis, setResponsaveis] = useState({
    diligenciadores: [],
    solicitantes: [],
    aprovadores: [],
    executores: []
  });
  const [hhClientes, setHhClientes] = useState({});
  const [hhPrevisao, setHhPrevisao] = useState('0 Horas');
  const [valorInputs, setValorInputs] = useState({});
  const [pesoInputs, setPesoInputs] = useState({});
  const [metroQuadradoInputs, setMetroQuadradoInputs] = useState({});
  
  // Estados para validação em tempo real
  const [realTimeErrors, setRealTimeErrors] = useState({});
  const [fieldValidationStatus, setFieldValidationStatus] = useState({});

  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const validateFieldRealTime = (fieldName, value) => {
    if (!hasLoadedInitialData && isLoadingExistingData) {
      return true;
    }
    
    const validation = validateField(fieldName, value, grupo);
    
    setFieldValidationStatus(prev => ({
      ...prev,
      [fieldName]: validation.isValid ? 'valid' : 'invalid'
    }));
    
    if (!validation.isValid) {
      setRealTimeErrors(prev => ({
        ...prev,
        [fieldName]: validation.error
      }));
    } else {
      setRealTimeErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
    
    return validation.isValid;
  };

  const handleFieldChange = (fieldName, value) => {
    setValue(fieldName, value);
    validateFieldRealTime(fieldName, value);
    
    // Lógica de preenchimento automático do prazo de execução
    if (fieldName === 'data_emissao_os' && value) {
      try {
        // Converter a data de emissão para objeto Date
        const dataEmissao = new Date(value);
        
        // Verificar se a data é válida
        if (!isNaN(dataEmissao.getTime())) {
          // Calcular prazo de execução (30 dias após a data de emissão)
          const prazoExecucao = new Date(dataEmissao);
          prazoExecucao.setDate(prazoExecucao.getDate() + 30);
          
          // Converter para o formato ISO
          const prazoExecucaoISO = prazoExecucao.toISOString();
          
          // Atualizar o campo de prazo de execução
          setValue('prazo_execucao_servico', prazoExecucaoISO);
          validateFieldRealTime('prazo_execucao_servico', prazoExecucaoISO);
        }
      } catch (error) {
        console.error('Erro ao calcular prazo de execução:', error);
      }
    }
    
    // Limpar prazo de execução se a data de emissão for limpa
    if (fieldName === 'data_emissao_os' && !value) {
      setValue('prazo_execucao_servico', '');
      validateFieldRealTime('prazo_execucao_servico', '');
    }
  };

  const handleFieldBlur = (fieldName) => {
    const value = getValues(fieldName);
    validateFieldRealTime(fieldName, value);
  };

  const isFieldRequiredWithOptions = (params) => isFieldRequired({...params, opcoes});

  const getStatusName = (statusId, opcoesArray) => {
    if (!statusId || !opcoesArray) return '';
    const status = opcoesArray.find(s => s.id === parseInt(statusId) || s.id === statusId);
    return status ? status.nome : statusId;
  };

  useEffect(() => {
    async function fetchOpcoesDinamicas() {
      try {
        setIsLoadingOptions(true);
        const [
          acoes,
          demandas,
          percentuais,
          tiposMaterial,
          statusMaterial,
          statusDMS,
          statusBMS,
          statusFRS,
          tiposCQ,
          niveisCQ,
          ensaiosCQ,
          responsaveisMaterial,
          statusOS,
          statusOSManual,
          statusOSEletronica
        ] = await Promise.all([
          osAPI.getAcoesSolicitacao(),
          osAPI.getDemandas(),
          osAPI.getPercentuaisCQ(),
          osAPI.getTiposMaterial(),
          osAPI.getStatusMaterial(),
          osAPI.getStatusDMS(),
          osAPI.getStatusBMS(),
          osAPI.getStatusFRS(),
          osAPI.getTiposCQ(),
          osAPI.getNiveisCQ(),
          osAPI.getEnsaiosCQ(),
          osAPI.getResponsaveisMaterial(),
          osAPI.getStatusOS(),
          osAPI.getStatusOSManual(),
          osAPI.getStatusOSEletronica()
        ]);
        
        setOpcoesDinamicas({
          acoes: Array.isArray(acoes) ? acoes : [],
          demandas: Array.isArray(demandas) ? demandas : [],
          percentuais: Array.isArray(percentuais) ? percentuais : [],
          tiposMaterial: Array.isArray(tiposMaterial) ? tiposMaterial : [],
          statusMaterial: Array.isArray(statusMaterial) ? statusMaterial : [],
          statusDMS: Array.isArray(statusDMS) ? statusDMS : [],
          statusBMS: Array.isArray(statusBMS) ? statusBMS : [],
          statusFRS: Array.isArray(statusFRS) ? statusFRS : [],
          tiposCQ: Array.isArray(tiposCQ) ? tiposCQ : [],
          niveisCQ: Array.isArray(niveisCQ) ? niveisCQ : [],
          ensaiosCQ: Array.isArray(ensaiosCQ) ? ensaiosCQ : [],
          responsaveisMaterial: Array.isArray(responsaveisMaterial) ? responsaveisMaterial : [],
          statusOS: Array.isArray(statusOS) ? statusOS : [],
          statusOSManual: Array.isArray(statusOSManual) ? statusOSManual : [],
          statusOSEletronica: Array.isArray(statusOSEletronica) ? statusOSEletronica : [],
          statusLevantamento: [],
          statusProducao: [],
        });
      } catch (error) {
        console.error('Erro ao carregar opções dinâmicas:', error);
        setOpcoesDinamicas({
          acoes: [],
          demandas: [],
          percentuais: [],
          tiposMaterial: [],
          statusMaterial: [],
          statusDMS: [],
          statusBMS: [],
          statusFRS: [],
          tiposCQ: [],
          niveisCQ: [],
          ensaiosCQ: [],
          responsaveisMaterial: [],
          status_os: [],
          statusOSManual: [],
          statusOSEletronica: [],
          statusLevantamento: [],
          statusProducao: [],
        });
      } finally {
        setIsLoadingOptions(false);
      }
    }
    fetchOpcoesDinamicas();
  }, []);




  useEffect(() => {
    async function fetchResponsaveis() {
      try {
        const [
          diligenciadoresResponse,
          executoresResponse
        ] = await Promise.all([
          osAPI.getDiligenciadores(),
          osAPI.getExecutores()
        ]);
        
        const diligenciadores = Array.isArray(diligenciadoresResponse) ? diligenciadoresResponse : [];
        const executores = Array.isArray(executoresResponse) ? executoresResponse : [];
        
        setResponsaveis({
          diligenciadores,
          executores
        });
        
      } catch (error) {
        console.error('Erro ao carregar responsáveis:', error);
        // Definir arrays vazios em caso de erro
        setResponsaveis({
          diligenciadores: [],
          executores: []
        });
      }
    }
    fetchResponsaveis();
  }, []);

  const {
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
    clearErrors,
    setError,
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      data_solicitacao_os: '',
      data_emissao_os: '',
      nome_cliente: '',
      numero_contrato: '',
      unidade_cliente: '',
      setor_unidade_cliente: '',
      prazo_execucao_servico: '',
      status_regime_os: '',
      nome_diligenciador_os: '',
      nome_solicitante_cliente: '',
      nome_responsavel_aprovacao_os_cliente: '',
      nome_responsavel_execucao_servico: '',
      id_demanda: '',
      descricao_resumida: '',
      descricao_detalhada: '',
      tipo_cq: '',
      opcoes_espec_cq: '',
      nivel_inspecao_cq: '',
      tipo_ensaio_cq: '',
      percentual_cq: '',
      quantidade_cq: '',
      tamanho_cq: '',
      texto_tamanho_cq: '',
      existe_orcamento: '',
      peso_fabricacao: '',
      metro_quadrado_pintura_revestimento: '',
      // Campos de valor com máscara
      valor_fabricacao: '',
      valor_levantamento: '',
      valor_material_fabricacao: '',
      valor_material_pintura: '',
      valor_servico_pintura_revestimento: '',
      valor_material_montagem: '',
      valor_montagem: '',
      valor_inspecao: '',
      // valor_hh: '',
      valor_manutencao_valvula: '',
      valor_servico_terceiros: '',
      soma_valores: '',
      hh_previsao: '',
      // Campos "Haverá valor"
      havera_valor_fabricacao: '',
      havera_valor_levantamento: '',
      havera_valor_material_fabricacao: '',
      havera_valor_material_pintura: '',
      havera_valor_servico_pintura_revestimento: '',
      havera_valor_material_montagem: '',
      havera_valor_montagem: '',
      havera_valor_inspecao: '',
      // havera_valor_hh: '',
      havera_valor_manutencao_valvula: '',
      havera_valor_servico_terceiros: '',
      // Status e assinatura
      status_os: '',
      status_os_manual: '',
      data_aprovacao_assinatura_manual: '',
      status_os_eletronica: '',
      data_assinatura_eletronica_os: '',
      numero_os_eletronica: '',
      // Levantamento e produção
      status_levantamento: '',
      status_producao: '',
      // GMI/GME/RTIP/RTM
      data_gmi: '',
      descricao_gmi: '',
      arquivo_anexo_gmi: '',
      data_gme: '',
      descricao_gme: '',
      arquivo_anexo_gme: '',
      data_rtip: '',
      descricao_rtip: '',
      arquivo_anexo_rtip: '',
      data_rtm: '',
      descricao_rtm: '',
      arquivo_anexo_rtm: '',
      // DMS/BMS/FRS
      opcoes_dms: '',
      status_dms: '',
      numero_dms: '',
      data_aprovacao_dms: '',
      opcoes_bms: '',
      status_bms: '',
      numero_bms: '',
      data_aprovacao_bms: '',
      opcoes_frs: '',
      status_frs: '',
      numero_frs: '',
      data_aprovacao_frs: '',
      // Notas fiscais
      opcoes_nf: '',
      numero_nf_1: '',
      data_emissao_nf_1: '',
      valor_nf_1: '',
      arquivo_anexo_nf_1: '',
      numero_nf_2: '',
      data_emissao_nf_2: '',
      valor_nf_2: '',
      arquivo_anexo_nf_2: '',
      numero_nf_3: '',
      data_emissao_nf_3: '',
      valor_nf_3: '',
      arquivo_anexo_nf_3: '',
      numero_nf_4: '',
      data_emissao_nf_4: '',
      valor_nf_4: '',
      arquivo_anexo_nf_4: '',
      numero_nf_5: '',
      data_emissao_nf_5: '',
      valor_nf_5: '',
      arquivo_anexo_nf_5: '',
      // Bloco 15: Observações e Saldo
      saldo_final: '',
      observacao: '',
      soma_notas_fiscais: '',
      // Formsets dinâmicos
      documentos_solicitacao: [],
      datas_previstas: [],
      acoes_solicitacao: [],
      controles: [],
      ordens: [],
      documentos: [],
      levantamentos: [],
      materiais: [],
      gmis: [],
      gmes: [],
      rtips: [],
      rtms: [],
      dmss: [],
      bmss: [],
      frss: [],
      nfsaidas: [],
      nfvendas: []
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    if (osId && hasLoadedInitialData && !isLoadingExistingData) {
      return;
    }

    if (isLoadingExistingData) {
      return;
    }

    if (!isLoadingExistingData && hasLoadedInitialData && watchedValues.nome_cliente && opcoes.clientes?.length) {
      const cliente = opcoes.clientes.find(c => String(c.id) === String(watchedValues.nome_cliente));
      if (cliente) {
        osAPI.getDadosCliente(cliente.nome).then((dados) => {
          setOpcoes((prev) => ({
            ...prev,
            contratos: dados.contratos || [],
            unidades: dados.unidades || [],
            setores: dados.setores || [],
            especs_cq: dados.opcoes_espec_cq || [],
          }));
          setResponsaveis((prev) => ({
            ...prev,
            aprovadores: dados.aprovadores || [],
            solicitantes: dados.solicitantes || [],
          }));
          setHhClientes(dados.hh_clientes || {});
        }).catch((error) => {
          console.error('Erro ao carregar dados do cliente:', error);
        });
      }
    }
  }, [watchedValues.nome_cliente, opcoes.clientes, isLoadingExistingData, hasLoadedInitialData, osId]);

  const { hasGroup } = useAuth();
  const isQualidade = hasGroup('Qualidade');

  const handleCurrencyChange = (fieldName, value) => {
    let raw = value.replace(/\D/g, '');
    setValorInputs((prev) => ({ ...prev, [fieldName]: raw }));
    const number = parseInt(raw, 10) || 0;
    setValue(fieldName, number);
    updateSomaValores();
    
    validateFieldRealTime(fieldName, number);
  };

  const handleCurrencyBlur = (fieldName) => {
    const raw = valorInputs[fieldName];
    const number = parseInt(raw, 10) || 0;
    setValorInputs((prev) => ({ ...prev, [fieldName]: number === 0 ? '' : formatCurrencyInput(number) }));
  };

  const handleCurrencyFocus = (fieldName) => {
    let valorAtual = valorInputs[fieldName];
    if (valorAtual) {
      let number = parseInt(
        valorAtual
          .replace(/[^\d,]/g, '')
          .replace(/,\d{0,2}$/, '')
          .replace(/\D/g, ''),
        10
      ) || '';
      setValorInputs((prev) => ({ ...prev, [fieldName]: number.toString() }));
    }
  };

  const handleWeightChange = (fieldName, value) => {
    let raw = value.replace(/\D/g, '');
    setPesoInputs((prev) => ({ ...prev, [fieldName]: raw }));
    const number = parseFloat(raw) || 0;
    setValue(fieldName, number);
    validateFieldRealTime(fieldName, number);
  };

  const handleWeightBlur = (fieldName) => {
    const raw = pesoInputs[fieldName];
    const number = parseFloat(raw) || 0;
    setPesoInputs((prev) => ({ ...prev, [fieldName]: number === 0 ? '' : formatWeightInput(number) }));
  };

  const handleWeightFocus = (fieldName) => {
    let valorAtual = pesoInputs[fieldName];
    if (valorAtual) {
      let number = parseFloat(
        valorAtual
          .replace(/[^\d,]/g, '')
          .replace(/,\d{0,2}$/, '')
          .replace(/\D/g, ''),
        10
      ) || '';
      setPesoInputs((prev) => ({ ...prev, [fieldName]: number.toString() }));
    }
  };

  const handleSquareMeterChange = (fieldName, value) => {
    let raw = value.replace(/\D/g, '');
    setMetroQuadradoInputs((prev) => ({ ...prev, [fieldName]: raw }));
    const number = parseFloat(raw) || 0;
    setValue(fieldName, number);
    validateFieldRealTime(fieldName, number);
  };

  const handleSquareMeterBlur = (fieldName) => {
    const raw = metroQuadradoInputs[fieldName];
    const number = parseFloat(raw) || 0;
    setMetroQuadradoInputs((prev) => ({ ...prev, [fieldName]: number === 0 ? '' : formatSquareMeterInput(number) }));
  };

  const handleSquareMeterFocus = (fieldName) => {
    let valorAtual = metroQuadradoInputs[fieldName];
    if (valorAtual) {
      let number = parseFloat(
        valorAtual
          .replace(/[^\d,]/g, '')
          .replace(/,\d{0,2}$/, '')
          .replace(/\D/g, ''),
        10
      ) || '';
      setMetroQuadradoInputs((prev) => ({ ...prev, [fieldName]: number.toString() }));
    }
  };

  useEffect(() => {
    valorFields.forEach((field) => {
      const formValue = watchedValues[field];
      if (formValue !== undefined && formValue !== null && formValue !== '') {
        const formattedValue = formValue === 0 ? '' : formatCurrencyInput(formValue);
        setValorInputs((prev) => ({ 
          ...prev, 
          [field]: formattedValue 
        }));
      }
    });
  }, [osId, hasLoadedInitialData]);

  useEffect(() => {
    const pesoFields = ['peso_fabricacao'];
    pesoFields.forEach((field) => {
      const formValue = watchedValues[field];
      if (formValue !== undefined && formValue !== null && formValue !== '') {
        const formattedValue = formValue === 0 ? '' : formatWeightInput(formValue);
        setPesoInputs((prev) => ({ 
          ...prev, 
          [field]: formattedValue 
        }));
      }
    });
  }, [osId, hasLoadedInitialData]);

  useEffect(() => {
    const metroQuadradoFields = ['metro_quadrado_pintura_revestimento'];
    metroQuadradoFields.forEach((field) => {
      const formValue = watchedValues[field];
      if (formValue !== undefined && formValue !== null && formValue !== '') {
        const formattedValue = formValue === 0 ? '' : formatSquareMeterInput(formValue);
        setMetroQuadradoInputs((prev) => ({ 
          ...prev, 
          [field]: formattedValue 
        }));
      }
    });
  }, [osId, hasLoadedInitialData]);

  const updateSomaValores = () => {
    // Campos de valor e seus respectivos campos "havera"
    const camposValor = [
      { valor: 'valor_fabricacao', havera: 'havera_valor_fabricacao' },
      { valor: 'valor_levantamento', havera: 'havera_valor_levantamento' },
      { valor: 'valor_material_fabricacao', havera: 'havera_valor_material_fabricacao' },
      { valor: 'valor_material_pintura', havera: 'havera_valor_material_pintura' },
      { valor: 'valor_servico_pintura_revestimento', havera: 'havera_valor_servico_pintura_revestimento' },
      { valor: 'valor_material_montagem', havera: 'havera_valor_material_montagem' },
      { valor: 'valor_montagem', havera: 'havera_valor_montagem' },
      { valor: 'valor_inspecao', havera: 'havera_valor_inspecao' },
      { valor: 'valor_manutencao_valvula', havera: 'havera_valor_manutencao_valvula' },
      { valor: 'valor_servico_terceiros', havera: 'havera_valor_servico_terceiros' }
    ];
    
    // Soma apenas os valores dos campos que têm "havera_valor" = "SIM"
    let soma = 0;
    camposValor.forEach(campo => {
      if (watchedValues[campo.havera] === 'SIM') {
        const valor = parseCurrency(watchedValues[campo.valor]);
        soma += valor;
      }
    });
    
    // Soma das notas fiscais
    let somaNotasFiscais = 0;
    if (Array.isArray(watchedValues.nfvendas)) {
      somaNotasFiscais = watchedValues.nfvendas.reduce((acc, nf) => {
        const v = parseCurrency(nf && nf.preco_nota_fiscal_venda);
        return acc + v;
      }, 0);
    }
    
    setValue('soma_valores', soma);
    setValue('soma_notas_fiscais', somaNotasFiscais);
    const saldoFinal = somaNotasFiscais - soma;
    setValue('saldo_final', saldoFinal);
  };

  useEffect(() => {
    updateSomaValores();
  }, [
    watchedValues.valor_fabricacao,
    watchedValues.valor_levantamento,
    watchedValues.valor_material_fabricacao,
    watchedValues.valor_material_pintura,
    watchedValues.valor_servico_pintura_revestimento,
    watchedValues.valor_material_montagem,
    watchedValues.valor_montagem,
    watchedValues.valor_inspecao,
    watchedValues.valor_manutencao_valvula,
    watchedValues.valor_servico_terceiros,
    watchedValues.havera_valor_fabricacao,
    watchedValues.havera_valor_levantamento,
    watchedValues.havera_valor_material_fabricacao,
    watchedValues.havera_valor_material_pintura,
    watchedValues.havera_valor_servico_pintura_revestimento,
    watchedValues.havera_valor_material_montagem,
    watchedValues.havera_valor_montagem,
    watchedValues.havera_valor_inspecao,
    watchedValues.havera_valor_manutencao_valvula,
    watchedValues.havera_valor_servico_terceiros,
    watchedValues.nfvendas
  ]);

  const valorFields = [
    'valor_fabricacao',
    'valor_levantamento',
    'valor_material_fabricacao',
    'valor_material_pintura',
    'valor_servico_pintura_revestimento',
    'valor_material_montagem',
    'valor_montagem',
    'valor_inspecao',
    'valor_manutencao_valvula',
    'valor_servico_terceiros',
  ];
  const haveraFields = [
    'havera_valor_fabricacao',
    'havera_valor_levantamento',
    'havera_valor_material_fabricacao',
    'havera_valor_material_pintura',
    'havera_valor_servico_pintura_revestimento',
    'havera_valor_material_montagem',
    'havera_valor_montagem',
    'havera_valor_inspecao',
    'havera_valor_manutencao_valvula',
    'havera_valor_servico_terceiros',
  ];

  useEffect(() => {
    valorFields.forEach((valorField, idx) => {
      const haveraField = haveraFields[idx];
      if (watchedValues[haveraField] === 'NÃO') {
        if (watchedValues[valorField] !== 0) {
          setValue(valorField, 0);
        }
      }
    });
  }, [
    ...haveraFields.map(f => watchedValues[f]),
  ]);

  const isValueFieldDisabled = (haveraValor) => {
    return haveraValor !== 'SIM';
  };



  const loadOpcoes = async () => {
    try {
      const clientesResponse = await osAPI.getClientes().catch(() => []);
      const todasOpcoes = await osAPI.getOpcoes().catch(() => ({}));
      const statusOSResponse = await osAPI.getStatusOS().catch(() => []);
      const statusOSManualResponse = await osAPI.getStatusOSManual().catch(() => []);
      const statusOSEletronicaResponse = await osAPI.getStatusOSEletronica().catch(() => []);
      const regimesOSResponse = await osAPI.getRegimesOS().catch(() => []);

      const clientes = Array.isArray(clientesResponse) ? clientesResponse : 
                      (clientesResponse?.results ? clientesResponse.results : []);

      const novasOpcoes = {
        contratos: (todasOpcoes.contratos || []).map(c => typeof c === 'object' ? c : { id: c, nome: c }),
        unidades: (todasOpcoes.unidades || []).map(u => typeof u === 'object' ? u : { id: u, nome: u }),
        setores: (todasOpcoes.setores || []).map(s => typeof s === 'object' ? s : { id: s, nome: s }),
        tipos_cq: todasOpcoes.tipos_cq || [],
        especs_cq: todasOpcoes.especs_cq || [],
        niveis_cq: todasOpcoes.niveis_cq || [],
        ensaios_cq: todasOpcoes.ensaios_cq || [],
        clientes: clientes.map(c => typeof c === 'object' ? c : { id: c, nome: c }),
        status_levantamento: todasOpcoes.status_levantamento || [],
        status_producao: todasOpcoes.status_producao || [],
        tiposDocumento: todasOpcoes.tipos_documento || [],
        acoes: todasOpcoes.acoes_solicitacao || [],
        percentuais: todasOpcoes.percentuais_cq || [],
        tiposMaterial: todasOpcoes.tipos_material || [],
        statusMaterial: todasOpcoes.status_material || [],
        responsaveisMaterial: todasOpcoes.responsaveis_material || [],
        statusDMS: todasOpcoes.status_dms || [],
        statusBMS: todasOpcoes.status_bms || [],
        statusFRS: todasOpcoes.status_frs || [],
        status_os: Array.isArray(statusOSResponse) ? statusOSResponse : [],
        status_os_manual: Array.isArray(statusOSManualResponse) ? statusOSManualResponse : [],
        status_os_eletronica: Array.isArray(statusOSEletronicaResponse) ? statusOSEletronicaResponse : [],
        regimesOS: Array.isArray(regimesOSResponse) ? regimesOSResponse : [],
      };
      
      setOpcoes(novasOpcoes);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
      setOpcoes({
        contratos: [],
        unidades: [],
        setores: [],
        tipos_cq: [],
        especs_cq: [],
        niveis_cq: [],
        ensaios_cq: [],
        clientes: [],
        status_levantamento: [],
        status_producao: [],
        acoes: [],
        percentuais: [],
        tiposMaterial: [],
        statusMaterial: [],
        responsaveisMaterial: [],
        statusDMS: [],
        statusBMS: [],
        statusFRS: [],
        status_os: [],
        status_os_manual: [],
        status_os_eletronica: [],
        regimesOS: [],
        tiposDocumento: [],
      });
    }
  };

  const loadOS = async () => {
    if (!osId) return;
    
    try {
      setIsLoadingExistingData(true);
      setGlobalError('');
      
      const os = await osAPI.get(osId);
      
      if (!os || typeof os !== 'object' || os === null) {
        throw new Error('Dados da OS inválidos');
      }
      
      const formData = {};
      
      Object.keys(os).forEach(key => {
        let valueToSet = os[key];
        
        if (['nome_cliente', 'numero_contrato', 'unidade_cliente', 'setor_unidade_cliente',
             'nome_diligenciador_os', 'nome_responsavel_execucao_servico',
             'id_demanda', 'status_regime_os', 'status_os', 'status_os_manual', 'status_os_eletronica'].includes(key)) {
          if (valueToSet && typeof valueToSet === 'object' && valueToSet.id) {
            valueToSet = valueToSet.id; // Manter como inteiro para campos de status
          } else if (valueToSet !== null && valueToSet !== undefined && valueToSet !== '') {
            valueToSet = String(valueToSet);
          } else {
            return;
          }
        }
        
        if (['nome_solicitante_cliente', 'nome_responsavel_aprovacao_os_cliente'].includes(key)) {
          if (valueToSet !== null && valueToSet !== undefined) {
            valueToSet = String(valueToSet);
          } else {
            return;
          }
        }
        
        if (['data_solicitacao_os', 'data_emissao_os', 'prazo_execucao_servico'].includes(key)) {
          if (valueToSet) {
            const convertedDate = toDatetimeLocal(valueToSet);
            if (convertedDate) {
              valueToSet = convertedDate;
            } else {
              return;
            }
          } else {
            return;
          }
        }
        
        if (valueToSet !== null && valueToSet !== undefined && valueToSet !== '') {
          formData[key] = valueToSet;
        }
      });
      
      Object.keys(formData).forEach(key => {
        const newValue = formData[key];
        
        if (newValue !== null && newValue !== undefined && newValue !== '') {
          setValue(key, newValue);
        }
      });
      
      if (os.documentos_solicitacao) {

        setValue('documentos_solicitacao', os.documentos_solicitacao);
      }
      
      if (os.datas_previstas) {
        setValue('datas_previstas', os.datas_previstas);
      }
      
      if (os.acoes_solicitacao) {
        setValue('acoes_solicitacao', os.acoes_solicitacao);
      }
      
      if (os.controles_qualidade) {
        setValue('controles', os.controles_qualidade);
      }
      
      if (os.ordens_cliente) {
        setValue('ordens', os.ordens_cliente);
      }
      
      if (os.documentos_entrada) {
        setValue('documentos', os.documentos_entrada);
      }
      
      if (os.levantamentos) {
        setValue('levantamentos', os.levantamentos);
      }
      
      if (os.materiais) {
        setValue('materiais', os.materiais);
      }
      
      if (os.gmis) {
        setValue('gmis', os.gmis);
      }
      
      if (os.gmes) {
        setValue('gmes', os.gmes);
      }
      
      if (os.rtips) {
        setValue('rtips', os.rtips);
      }
      
      if (os.rtms) {
        setValue('rtms', os.rtms);
      }
      
      if (os.dms) {
        setValue('dmss', os.dms);
      }
      
      if (os.bms) {
        setValue('bmss', os.bms);
      }
      
      if (os.frs) {
        setValue('frss', os.frs);
      }
      
      if (os.notas_fiscais_saida) {
        setValue('nfsaidas', os.notas_fiscais_saida);
      }
      
      if (os.notas_fiscais_venda) {
        setValue('nfvendas', os.notas_fiscais_venda);
      }
      
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      
      let errorMessage = 'Erro ao carregar dados da Ordem de Serviço';
      if (error.message === 'Resposta da API inválida') {
        errorMessage = 'Resposta inválida da API';
      } else if (error.message === 'Dados da OS inválidos') {
        errorMessage = 'Dados da Ordem de Serviço inválidos';
      } else {
        errorMessage = error.message;
      }
      
      setGlobalError(errorMessage);
    } finally {
      setIsLoadingExistingData(false);
      setHasLoadedInitialData(true);
    }
  };

  const validateRequiredFormsets = (data, grupo) => {
    const errors = {};
    
    if (grupo === 'Básico') {
      // Validar campos condicionais baseados em existe_orcamento
      if (data.existe_orcamento === 'SIM') {
        if (!data.peso_fabricacao) {
          errors.peso_fabricacao = 'Peso de fabricação é obrigatório quando há orçamento';
        }
        if (!data.metro_quadrado_pintura_revestimento) {
          errors.metro_quadrado_pintura_revestimento = 'Metro quadrado de pintura é obrigatório quando há orçamento';
        }
      }
      
      // Validar formsets obrigatórios
      const requiredFormsets = [
        { name: 'documentos_solicitacao', title: 'documentos da solicitação' },
        { name: 'datas_previstas', title: 'datas previstas' },
        { name: 'acoes_solicitacao', title: 'ações/serviços' },
        { name: 'gmis', title: 'GMIs' },
        { name: 'rtips', title: 'RTIPs' }
      ];
      
      requiredFormsets.forEach(({ name, title }) => {
        if (!data[name] || data[name].length === 0) {
          errors[name] = `Pelo menos um ${title} é obrigatório para usuários básicos`;
        }
      });
      
      // Validar ordens e documentos se OS finalizada
      const isStatusFinalizadorValue = isStatusFinalizador(data.status_os, opcoes);
      if (isStatusFinalizadorValue) {
        if (!data.ordens || data.ordens.length === 0) {
          errors.ordens = 'Pelo menos uma ordem do cliente é obrigatória quando a OS está finalizada';
        }
        if (!data.documentos || data.documentos.length === 0) {
          errors.documentos = 'Pelo menos um documento de entrada é obrigatório quando a OS está finalizada';
        }
      }
    } else if (grupo === 'Qualidade') {
      // Para grupo Qualidade, validar apenas controles de qualidade
      if (!data.controles_qualidade || data.controles_qualidade.length === 0) {
        errors.controles_qualidade = 'Pelo menos um controle de qualidade é obrigatório para usuários do grupo Qualidade';
      } else {
        // Validar campos obrigatórios dentro de cada controle de qualidade
        const qualidadeRequiredFields = [
          'tipo_cq', 'opcoes_espec_cq', 'nivel_inspecao_cq', 'tipo_ensaio_cq',
          'percentual_cq', 'quantidade_cq', 'tamanho_cq', 'texto_tamanho_cq'
        ];
        
        data.controles_qualidade.forEach((controle, index) => {
          const missingFields = [];
          qualidadeRequiredFields.forEach(field => {
            // Verificar se o campo está vazio ou não preenchido
            const value = controle[field];
            if (!value || value === '' || value === 'undefined' || value === 'null' || value === undefined) {
              missingFields.push(field);
            }
          });
          
          if (missingFields.length > 0) {
            errors[`controles_qualidade.${index}`] = `Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`;
          }
        });
      }
    }
    
    return errors;
  };

  const onSubmit = async (data) => {
    const getFormsetFiles = () => {
      const formsetFiles = {};
      
      // Processar apenas formsets que realmente têm dados
      const processFormset = (formsetName, dataArray, fileFieldName = null) => {
        if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
          const processedArray = dataArray.map((item) => {
            const processedItem = { ...item };
            
            // Se há um campo de arquivo específico, processar
            if (fileFieldName) {
              const fileValue = item[fileFieldName];
              
              // Se o valor é null ou undefined, não incluir o campo
              if (fileValue === null || fileValue === undefined) {
                delete processedItem[fileFieldName];
              }
              // Se é uma string (URL de arquivo existente), MANTER o campo
              // O backend irá interpretar como "não alterar o arquivo existente"
              else if (typeof fileValue === 'string') {
                processedItem[fileFieldName] = fileValue;
              }
              // Se é um File object (novo arquivo), manter
              else if (fileValue instanceof File) {
                processedItem[fileFieldName] = fileValue;
              }
              // Se é qualquer outro tipo, não incluir
              else {
                delete processedItem[fileFieldName];
              }
            }
            
            return processedItem;
          });
          
          // Filtrar apenas itens que têm pelo menos um campo preenchido
          const validItems = processedArray.filter(item => {
            return Object.values(item).some(value => 
              value !== null && value !== undefined && value !== ''
            );
          });
          
          if (validItems.length > 0) {
            formsetFiles[formsetName] = validItems;
          }
        }
      };
      
      // Processar formsets com arquivos
      processFormset('gmis', data.gmis, 'arquivo_anexo_gmi');
      processFormset('rtips', data.rtips, 'arquivo_anexo_rtip');
      processFormset('documentos_solicitacao', data.documentos_solicitacao, 'documento_solicitacao');
      processFormset('levantamentos', data.levantamentos, 'arquivo_anexo_levantamento');
      processFormset('gmes', data.gmes, 'arquivo_anexo_gme');
      processFormset('rtms', data.rtms, 'arquivo_anexo_rtm');
      processFormset('nfsaidas', data.nfsaidas, 'arquivo_anexo_nota_fiscal_remessa_saida');
      processFormset('nfvendas', data.nfvendas, 'arquivo_anexo_nota_fiscal_venda');
      
      // Processar formsets sem arquivos
      processFormset('datas_previstas', data.datas_previstas);
      processFormset('acoes_solicitacao', data.acoes_solicitacao);
      processFormset('materiais', data.materiais);
      processFormset('controles', data.controles);
      processFormset('ordens', data.ordens);
      processFormset('documentos', data.documentos, 'documento_entrada');
      processFormset('dmss', data.dmss);
      processFormset('bmss', data.bmss);
      processFormset('frss', data.frss);
      
      return formsetFiles;
    };
    
    const formsetFiles = getFormsetFiles();
    
    // PROCESSAMENTO DOS FORMSETS ANTES DA CRIAÇÃO DO finalData
    // Processar campos de valor
    const valorFields = [
      'valor_fabricacao',
      'valor_levantamento',
      'valor_material_fabricacao',
      'valor_material_pintura',
      'valor_servico_pintura_revestimento',
      'valor_material_montagem',
      'valor_montagem',
      'valor_inspecao',
      'valor_manutencao_valvula',
      'valor_servico_terceiros',
    ];
    valorFields.forEach((field) => {
      data[field] = parseCurrency(data[field]);
    });

    // Processar campos de peso e metro quadrado
    const pesoFields = ['peso_fabricacao'];
    pesoFields.forEach((field) => {
      data[field] = parseWeight(data[field]);
    });

    const metroQuadradoFields = ['metro_quadrado_pintura_revestimento'];
    metroQuadradoFields.forEach((field) => {
      data[field] = parseSquareMeter(data[field]);
    });
    if (typeof data.hh_previsao === 'string') {
      data.hh_previsao = parseInt(data.hh_previsao);
    }

    // Processar campos de data
    const dateFields = [
      'data_solicitacao_os',
      'data_emissao_os',
      'prazo_execucao_servico',
      'data_aprovacao_assinatura_manual',
      'data_assinatura_eletronica_os',
      'data_gmi',
      'data_gme',
      'data_rtip',
      'data_rtm',
      'data_aprovacao_dms',
      'data_aprovacao_bms',
      'data_aprovacao_frs',
      'data_emissao_nf_1',
      'data_emissao_nf_2',
      'data_emissao_nf_3',
      'data_emissao_nf_4',
      'data_emissao_nf_5',
      'data_documento_entrada',
      'data_levantamento',
      'data_prevista_entrega',
    ];
    dateFields.forEach((field) => {
      if (!data[field]) {
        data[field] = null;
      } else {
        data[field] = toIsoDatetime(data[field]);
      }
    });

    // Processar campos de seleção
    const selectFields = [
      'status_os',
      'status_os_manual',
      'status_os_eletronica',
      'status_levantamento',
      'status_producao',
      'opcoes_dms',
      'opcoes_bms',
      'opcoes_frs',
      'opcoes_nf',
      'nome_cliente',
      'numero_contrato',
      'unidade_cliente',
      'setor_unidade_cliente',
      'nome_diligenciador_os',
      'nome_solicitante_cliente',
      'nome_responsavel_aprovacao_os_cliente',
      'nome_responsavel_execucao_servico',
      'id_demanda',
      'existe_orcamento',
    ];
    selectFields.forEach((field) => {
      if (data[field] === '' || data[field] === undefined || data[field] === null) {
        data[field] = null;
      } else {
        // Para campos de status, converter para inteiro
        if (['status_os', 'status_os_manual', 'status_os_eletronica', 'status_levantamento', 'status_producao'].includes(field)) {
          const fieldValue = parseInt(data[field]);
          if (!isNaN(fieldValue)) {
            data[field] = fieldValue;
          } else {
            data[field] = null;
          }
        }
        // Para outros campos de seleção, manter como string
        else if (['nome_diligenciador_os', 'nome_solicitante_cliente', 'nome_responsavel_aprovacao_os_cliente', 'nome_responsavel_execucao_servico'].includes(field)) {
          const fieldValue = parseInt(data[field]);
          if (fieldValue === null || fieldValue === undefined || fieldValue < 0) {
            data[field] = null;
          }
        }
      }
    });

    // Processar formsets - TRANSFORMAÇÃO DOS CAMPOS PLURAIS PARA SINGULARES
    if (data.materiais && Array.isArray(data.materiais)) {
      data.materiais = data.materiais.map(material => {
        const cleanedMaterial = { ...material };
        return cleanedMaterial;
      }).filter(material => {
        return Object.values(material).some(value => 
          value !== null && value !== undefined && value !== ''
        );
      });
    }

    if (Array.isArray(data.documentos)) {
      data.documentos_entrada = data.documentos.map((doc) => ({
        ...doc,
        data_documento_entrada: doc.data_documento_entrada ? toIsoDatetime(doc.data_documento_entrada) : null,
      }));
      delete data.documentos;
    }
    if (Array.isArray(data.levantamentos)) {
      data.levantamentos = data.levantamentos.map((lev) => ({
        ...lev,
        data_levantamento: lev.data_levantamento ? toIsoDatetime(lev.data_levantamento) : null,
      }));
    }
    if (Array.isArray(data.datas_previstas)) {
      data.datas_previstas = data.datas_previstas.map((d) => ({
        ...d,
        data_prevista_entrega: d.data_prevista_entrega ? toIsoDatetime(d.data_prevista_entrega) : null,
      }));
    }
    if (Array.isArray(data.acoes_solicitacao)) {
      data.acoes_solicitacao = data.acoes_solicitacao.map((a) => ({
        ...a,
      }));
    }
    if (Array.isArray(data.controles)) {
      data.controles_qualidade = data.controles.map((c) => ({
        ...c,
      }));
      delete data.controles;
    }
    if (Array.isArray(data.ordens)) {
      data.ordens_cliente = data.ordens.map((o) => ({
        ...o,
      }));
      delete data.ordens;
    }
    if (Array.isArray(data.gmis)) {
      data.gmis = data.gmis.map((g) => ({
        ...g,
        data_gmi: g.data_gmi ? toIsoDatetime(g.data_gmi) : null,
      }));
    }
    if (Array.isArray(data.gmes)) {
      data.gmes = data.gmes.map((g) => ({
        ...g,
        data_gme: g.data_gme ? toIsoDatetime(g.data_gme) : null,
      }));
    }
    if (Array.isArray(data.rtips)) {
      data.rtips = data.rtips.map((r) => ({
        ...r,
        data_rtip: r.data_rtip ? toIsoDatetime(r.data_rtip) : null,
      }));
    }
    if (Array.isArray(data.rtms)) {
      data.rtms = data.rtms.map((r) => ({
        ...r,
        data_rtm: r.data_rtm ? toIsoDatetime(r.data_rtm) : null,
      }));
    }
    if (Array.isArray(data.dmss)) {
      data.dms = data.dmss.map((d) => ({
        ...d,
        status_dms: d.status_dms || null,
        data_aprovacao_dms: d.data_aprovacao_dms ? toIsoDatetime(d.data_aprovacao_dms) : null,
      }));
      delete data.dmss;
    }
    if (Array.isArray(data.bmss)) {
      data.bms = data.bmss.map((b) => ({
        ...b,
        status_bms: b.status_bms || null,
        data_aprovacao_bms: b.data_aprovacao_bms ? toIsoDatetime(b.data_aprovacao_bms) : null,
      }));
      delete data.bmss;
    }
    if (Array.isArray(data.frss)) {
      data.frs = data.frss.map((f) => ({
        ...f,
        status_frs: f.status_frs || null,
        data_aprovacao_frs: f.data_aprovacao_frs ? toIsoDatetime(f.data_aprovacao_frs) : null,
      }));
      delete data.frss;
    }
    if (Array.isArray(data.nfsaidas)) {
      data.notas_fiscais_saida = data.nfsaidas.map((n) => ({
        ...n,
        data_nota_fiscal_remessa_saida: n.data_nota_fiscal_remessa_saida ? toIsoDatetime(n.data_nota_fiscal_remessa_saida) : null,
      }));
      delete data.nfsaidas;
    }
    if (Array.isArray(data.nfvendas)) {
      data.notas_fiscais_venda = data.nfvendas.map((n) => ({
        ...n,
        data_nota_fiscal_venda: n.data_nota_fiscal_venda ? toIsoDatetime(n.data_nota_fiscal_venda) : null,
      }));
      delete data.nfvendas;
    }

    // AGORA CRIAR O finalData COM OS DADOS JÁ PROCESSADOS
    const finalData = {
      ...data,
      ...formsetFiles
    };
    
    // Remover campos inúteis/obsoletos
    const camposInuteis = [
      'documento_entrada_cliente',
      'documento_saida', 
      'documento_saida_validacao',
      'material_utilizado'
    ];
    
    camposInuteis.forEach(campo => {
      delete finalData[campo];
    });
    
    // Validar apenas campos realmente obrigatórios para o grupo
    // Para Administrador e Superior, não validar campos obrigatórios
    if (grupo === 'Administrador' || grupo === 'Superior') {
      // Não fazer validação de campos obrigatórios para administradores
    } else if (grupo === 'Qualidade') {
      // Para grupo Qualidade, não validar campos individuais aqui
      // A validação será feita apenas na função validateRequiredFormsets
      // que verifica os campos dentro do formset controles_qualidade
      
      // Verificar se há controles de qualidade
      if (!finalData.controles_qualidade || finalData.controles_qualidade.length === 0) {
        setGlobalError('Pelo menos um controle de qualidade é obrigatório para usuários do grupo Qualidade');
        return;
      }
    } else {
      // Para grupo Básico, validar todos os campos obrigatórios
      const basicRequiredFields = [
        'data_solicitacao_os',
        'data_emissao_os',
        'nome_cliente',
        'numero_contrato',
        'unidade_cliente',
        'setor_unidade_cliente',
        'prazo_execucao_servico',
        'status_regime_os',
        'nome_diligenciador_os',
        'nome_solicitante_cliente',
        'nome_responsavel_aprovacao_os_cliente',
        'nome_responsavel_execucao_servico',
        'id_demanda',
        'descricao_resumida',
        'status_os',
        'status_levantamento',
        'status_producao',
        'opcoes_dms',
        'opcoes_bms',
        'opcoes_frs'
      ];
      
      const missingFields = basicRequiredFields.filter(field => {
        const value = finalData[field];
        if (field === 'nome_cliente' || field === 'nome_diligenciador_os' || 
            field === 'nome_solicitante_cliente' || field === 'nome_responsavel_aprovacao_os_cliente' || 
            field === 'nome_responsavel_execucao_servico' || field === 'id_demanda' ||
            field === 'numero_contrato' || field === 'unidade_cliente' || field === 'setor_unidade_cliente') {
          const isEmpty = !value || value === '' || value === 'undefined' || value === 'null';
          return isEmpty;
        }
        const isEmpty = !value || value === '' || value === 'undefined' || value === 'null';
        return isEmpty;
      });
      
      if (missingFields.length > 0) {
        setGlobalError(`Por favor, preencha os seguintes campos obrigatórios: ${missingFields.join(', ')}`);
        return;
      }
    }
    
    // Validar formsets obrigatórios apenas se necessário
    // Para Administrador e Superior, não validar formsets obrigatórios
    if (grupo !== 'Administrador' && grupo !== 'Superior') {
      const formsetErrors = validateRequiredFormsets(finalData, grupo);
      if (Object.keys(formsetErrors).length > 0) {
        Object.entries(formsetErrors).forEach(([field, message]) => {
          setError(field, { type: 'validation', message: message });
        });
        setGlobalError('Por favor, preencha todos os campos obrigatórios dos formsets');
        return;
      }
    }
    
    try {
      setLoading(true);
      setSuccessMessage('');
      setGlobalError('');
      clearErrors();

      // Limpar payload removendo campos vazios e inúteis
      const cleanPayloadData = (data) => {
        const cleaned = {};
        
        Object.keys(data).forEach(key => {
          const value = data[key];
          
          // Pular campos inúteis
          if (camposInuteis.includes(key)) {
            return;
          }
          
          // Para campos de data vazios, definir como null
          if (key.includes('data_') && value === '') {
            cleaned[key] = null;
            return;
          }
          
          // Para valores vazios, pular (exceto para formsets)
          if (value === null || value === undefined || value === '') {
            if (key.includes('_') && (key.endsWith('s') || key.includes('formset'))) {
              // Para formsets, enviar array vazio apenas se realmente não há dados
              return;
            }
            return;
          }
          
          // Para arrays, filtrar apenas itens válidos
          if (Array.isArray(value)) {
            const filteredArray = value.filter(item => {
              if (!item || typeof item !== 'object') {
                return false;
              }
              
              // Se tem ID, é um item existente
              if (item.id) {
                return true;
              }
              
              // Verificar se tem pelo menos um campo com valor
              const hasValidProps = Object.keys(item).some(propKey => {
                const propValue = item[propKey];
                const isValid = propValue !== null && propValue !== undefined && propValue !== '';
                return isValid;
              });
              
              return hasValidProps;
            });
            
            if (filteredArray.length > 0) {
              cleaned[key] = filteredArray;
            }
          }
          else if (typeof value === 'object' && value !== null) {
            const hasValidProps = Object.keys(value).some(propKey => {
              const propValue = value[propKey];
              return propValue !== null && propValue !== undefined && propValue !== '';
            });
            
            if (hasValidProps) {
              cleaned[key] = value;
            }
          }
          else {
            cleaned[key] = value;
          }
        });
        
        return cleaned;
      };
      
      const payload = cleanPayloadData(finalData);

      // Validar arquivos nos formsets
      const validateFormsetFiles = (payload) => {
        const errors = {};
        
        const formsetFiles = [
          { key: 'documentos_solicitacao', field: 'documento_solicitacao' },
          { key: 'documentos', field: 'documento_entrada' },
          { key: 'gmis', field: 'arquivo_anexo_gmi' },
          { key: 'rtips', field: 'arquivo_anexo_rtip' },
          { key: 'levantamentos', field: 'arquivo_anexo_levantamento' },
          { key: 'gmes', field: 'arquivo_anexo_gme' },
          { key: 'rtms', field: 'arquivo_anexo_rtm' },
          { key: 'nfsaidas', field: 'arquivo_anexo_nota_fiscal_remessa_saida' },
          { key: 'nfvendas', field: 'arquivo_anexo_nota_fiscal_venda' }
        ];
        
        formsetFiles.forEach(({ key, field }) => {
          if (payload[key] && Array.isArray(payload[key])) {
            payload[key].forEach((item, index) => {
              if (item[field]) {
                // Validar se é um arquivo válido (File object ou string URL)
                const isValidFile = isFileFieldValid(item[field]);
                
                if (!isValidFile) {
                  errors[`${key}[${index}].${field}`] = 'Arquivo inválido';
                }
              }
            });
          }
        });
        
        return errors;
      };
      
      const formsetErrors = validateFormsetFiles(payload);
      if (Object.keys(formsetErrors).length > 0) {
        Object.entries(formsetErrors).forEach(([field, message]) => {
          setError(field, { type: 'validation', message: message });
        });
        setGlobalError('Por favor, corrija os erros nos formsets antes de enviar.');
        return;
      }

      if (osId) {
        await osAPI.update(osId, payload);
        showSuccess('Ordem de Serviço atualizada com sucesso!');
      } else {
        await osAPI.create(payload);
        showSuccess('Ordem de Serviço criada com sucesso!');
      }
      setSuccessMessage('Ordem de Serviço salva com sucesso!');
      if (onSave) {
        onSave();
      }
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data) {
        const backendErrors = error.response.data;
        
        clearErrors();
        
        Object.entries(backendErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            setError(field, { type: 'backend', message: messages[0] });
          } else if (typeof messages === 'string') {
            setError(field, { type: 'backend', message: messages });
          } else if (typeof messages === 'object') {
            Object.entries(messages).forEach(([subField, subMessages]) => {
              const fullFieldName = `${field}.${subField}`;
              if (Array.isArray(subMessages)) {
                setError(fullFieldName, { type: 'backend', message: subMessages[0] });
              } else if (typeof subMessages === 'string') {
                setError(fullFieldName, { type: 'backend', message: subMessages });
              }
            });
          }
        });
        
        Object.entries(backendErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([subField, subMessages]) => {
                  const fullFieldName = `${field}.${index}.${subField}`;
                  let errorMessage = 'Erro de validação';
                  
                  if (Array.isArray(subMessages)) {
                    errorMessage = subMessages[0];
                  } else if (typeof subMessages === 'string') {
                    errorMessage = subMessages;
                  }
                  
                  setError(fullFieldName, { type: 'backend', message: errorMessage });
                });
              }
            });
          }
        });
        
        if (backendErrors.documentos_solicitacao && Array.isArray(backendErrors.documentos_solicitacao)) {
          backendErrors.documentos_solicitacao.forEach((item, index) => {
            if (item && typeof item === 'object') {
              Object.entries(item).forEach(([subField, subMessages]) => {
                const fullFieldName = `documentos_solicitacao.${index}.${subField}`;
                let errorMessage = 'Erro de validação';
                
                if (Array.isArray(subMessages)) {
                  errorMessage = subMessages[0];
                } else if (typeof subMessages === 'string') {
                  errorMessage = subMessages;
                }
                
                setError(fullFieldName, { type: 'backend', message: errorMessage });
              });
            }
          });
        }
        
        setGlobalError('Por favor, corrija os erros destacados no formulário.');
        showError('Por favor, corrija os erros destacados no formulário.');
      } else {
        const friendlyError = getFriendlyErrorMessage(error, 'salvar a Ordem de Serviço');
        setGlobalError(friendlyError);
        showError(friendlyError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewClick = async () => {
    try {
      setLoadingPreview(true);
      const formData = watch();
      
      // Abrir preview em nova aba
      const previewUrl = `/preview-valores?data=${encodeURIComponent(JSON.stringify(formData))}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error('Erro ao abrir preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };



  // Função para calcular HH
  function calcularHH(valores, hhClientes) {
    const campos = [
      'valor_fabricacao',
      'valor_levantamento',
      'valor_servico_pintura_revestimento',
      'valor_montagem',
      'valor_inspecao'
    ];
    let total = 0;
    for (let campo of campos) {
      const valor = parseFloat(valores[campo]) || 0;
      const fator = parseFloat(hhClientes[campo]) || 1;
      total += valor / fator;
    }
    return `${total.toFixed(0)} Horas`;
  }

  // Calcular hh_previsao ao alterar valores relevantes ou hhClientes
  useEffect(() => {
    const resultado = calcularHH(watchedValues, hhClientes);
    setHhPrevisao(resultado);
    setValue('hh_previsao', parseInt(resultado)); // Para garantir envio puro
  }, [
    watchedValues.valor_fabricacao,
    watchedValues.valor_levantamento,
    watchedValues.valor_servico_pintura_revestimento,
    watchedValues.valor_montagem,
    watchedValues.valor_inspecao,
    hhClientes
  ]);

  function handleClienteChange(clienteId) {
    
    if (!clienteId || clienteId === '') return;
    
    if (isLoadingExistingData) {
      return;
    }
    
    if (osId && hasLoadedInitialData) {
      const clienteAtual = watchedValues.nome_cliente;
      if (String(clienteAtual) === String(clienteId)) {
        return;
      }
    }
    
    setValue('nome_cliente', clienteId);
    
    if (!opcoes.clientes || !Array.isArray(opcoes.clientes) || opcoes.clientes.length === 0) {
      setTimeout(() => handleClienteChange(clienteId), 100);
      return;
    }
    
    const cliente = opcoes.clientes.find(c => String(c.id) === String(clienteId));
    if (cliente) {
      osAPI.getDadosCliente(cliente.nome).then((dados) => {
        setOpcoes((prev) => ({
          ...prev,
          contratos: dados.contratos || [],
          unidades: dados.unidades || [],
          setores: dados.setores || [],
          especs_cq: dados.opcoes_espec_cq || [],
        }));
        setResponsaveis((prev) => ({
          ...prev,
          aprovadores: dados.aprovadores || [],
          solicitantes: dados.solicitantes || [],
        }));
        setHhClientes(dados.hh_clientes || {});
      }).catch((error) => {
        console.error('Erro ao carregar dados do cliente:', error);
      });
    }
  }
  




  useEffect(() => {
    let isInitializing = false;

    const initializeForm = async () => {
      if (isInitializing) {
        return;
      }

      isInitializing = true;
      
      try {
        setIsLoadingOptions(true);
        
        await loadOpcoes();
        
        if (osId) {
          await loadOS();
        } else {
          setHasLoadedInitialData(true);
        }
        
      } catch (error) {
        console.error('Erro ao inicializar formulário:', error);
        setGlobalError('Erro ao carregar dados da Ordem de Serviço');
        setHasLoadedInitialData(true);
      } finally {
        setIsLoadingOptions(false);
        setIsLoadingExistingData(false);
        isInitializing = false;
      }
    };

    initializeForm();
  }, [osId]);

  useEffect(() => {
    const syncDependentFields = async () => {
      if (!osId || !hasLoadedInitialData || isLoadingExistingData) {
        return;
      }

      const clienteId = watchedValues.nome_cliente;
      if (!clienteId) {
        return;
      }

      try {
        const cliente = opcoes.clientes?.find(c => String(c.id) === String(clienteId));
        if (!cliente) {
          return;
        }

        const dados = await getDadosCliente(cliente.nome);

        setOpcoes((prev) => ({
          ...prev,
          contratos: dados.contratos || [],
          unidades: dados.unidades || [],
          setores: dados.setores || [],
          especs_cq: dados.opcoes_espec_cq || [],
        }));
        
        setResponsaveis((prev) => ({
          ...prev,
          aprovadores: dados.aprovadores || [],
          solicitantes: dados.solicitantes || [],
        }));

        setTimeout(() => {
          const camposDependentes = [
            { campo: 'numero_contrato', opcoes: dados.contratos, opcoesKey: 'contratos' },
            { campo: 'unidade_cliente', opcoes: dados.unidades, opcoesKey: 'unidades' },
            { campo: 'setor_unidade_cliente', opcoes: dados.setores, opcoesKey: 'setores' },
            { campo: 'nome_responsavel_aprovacao_os_cliente', opcoes: dados.aprovadores, opcoesKey: 'aprovadores' },
            { campo: 'nome_solicitante_cliente', opcoes: dados.solicitantes, opcoesKey: 'solicitantes' },
          ];

          camposDependentes.forEach(({ campo, opcoes, opcoesKey }) => {
            const valorAtual = watchedValues[campo];
            if (valorAtual && opcoes && opcoes.length > 0) {
              const opcaoEncontrada = opcoes.find(opcao => 
                String(opcao.id) === String(valorAtual) || 
                String(opcao.nome) === String(valorAtual)
              );

              if (opcaoEncontrada) {
                const valorParaSetar = String(opcaoEncontrada.id);
                setValue(campo, valorParaSetar);
                trigger(campo);
              } else {
                const opcaoNaoEncontrada = {
                  id: valorAtual,
                  nome: `(Não encontrado - ID: ${valorAtual})`
                };
                
                setOpcoes(prev => ({
                  ...prev,
                  [opcoesKey]: [opcaoNaoEncontrada, ...(prev[opcoesKey] || [])]
                }));
                
                setValue(campo, String(valorAtual));
                trigger(campo);
              }
            }
          });
        }, 100);

      } catch (error) {
        console.error('Erro ao sincronizar campos dependentes:', error);
      }
    };

    syncDependentFields();
  }, [osId, hasLoadedInitialData, isLoadingExistingData, watchedValues.nome_cliente, opcoes.clientes]);

  useEffect(() => {
    if (!osId || !hasLoadedInitialData || isLoadingExistingData) {
      return;
    }

    const clienteId = watchedValues.nome_cliente;
    if (!clienteId) {
      return;
    }

    const cliente = opcoes.clientes?.find(c => String(c.id) === String(clienteId));
    if (!cliente) {
      return;
    }

    const corrigirCampo = async (campo, opcoesCampo, opcoesKey) => {
      const valorAtual = watchedValues[campo];
      
      if (!valorAtual) {
        return;
      }

      if (!opcoesCampo || opcoesCampo.length === 0) {
        return;
      }

      let opcaoEncontrada = null;
      
      opcaoEncontrada = opcoesCampo.find(opcao => String(opcao.id) === String(valorAtual));
      
      if (!opcaoEncontrada) {
        opcaoEncontrada = opcoesCampo.find(opcao => String(opcao.nome) === String(valorAtual));
      }

      if (opcaoEncontrada) {
        const valorParaSetar = String(opcaoEncontrada.id);
        setValue(campo, valorParaSetar);
        trigger(campo);
      } else {
        const opcaoNaoEncontrada = {
          id: valorAtual,
          nome: `(Não encontrado - ${valorAtual})`
        };
        
        setOpcoes(prev => ({
          ...prev,
          [opcoesKey]: [opcaoNaoEncontrada, ...(prev[opcoesKey] || [])]
        }));
        
        setValue(campo, String(valorAtual));
        trigger(campo);
      }
    };

    const corrigirCamposProblematicos = async () => {
      try {
        const dados = await getDadosCliente(cliente.nome);

        if (dados.contratos && dados.contratos.length > 0) {
          setOpcoes(prev => ({
            ...prev,
            contratos: dados.contratos
          }));
        }
        
        if (dados.unidades && dados.unidades.length > 0) {
          setOpcoes(prev => ({
            ...prev,
            unidades: dados.unidades
          }));
        }
        
        if (dados.setores && dados.setores.length > 0) {
          setOpcoes(prev => ({
            ...prev,
            setores: dados.setores
          }));
        }

        setTimeout(() => {
          corrigirCampo('numero_contrato', dados.contratos, 'contratos');
          corrigirCampo('unidade_cliente', dados.unidades, 'unidades');
          corrigirCampo('setor_unidade_cliente', dados.setores, 'setores');
        }, 200);

      } catch (error) {
        console.error('Erro ao corrigir campos problemáticos:', error);
      }
    };

    corrigirCamposProblematicos();
  }, [osId, hasLoadedInitialData, isLoadingExistingData, watchedValues.nome_cliente, opcoes.clientes, watchedValues.numero_contrato, watchedValues.unidade_cliente, watchedValues.setor_unidade_cliente]);

  useEffect(() => {
    if (!osId || !hasLoadedInitialData || isLoadingExistingData) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const camposProblematicos = ['numero_contrato', 'unidade_cliente', 'setor_unidade_cliente'];
      
      camposProblematicos.forEach(campo => {
        const valor = watchedValues[campo];
        if (valor) {
          validateFieldRealTime(campo, valor);
        }
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [osId, hasLoadedInitialData, isLoadingExistingData, watchedValues.numero_contrato, watchedValues.unidade_cliente, watchedValues.setor_unidade_cliente]);

  useEffect(() => {
    if (!osId || !hasLoadedInitialData || isLoadingExistingData) {
      return;
    }

    const opcoesCarregadas = 
      opcoes.contratos?.length > 0 ||
      opcoes.unidades?.length > 0 ||
      opcoes.setores?.length > 0 ||
      responsaveis.aprovadores?.length > 0 ||
      responsaveis.solicitantes?.length > 0;

    if (opcoesCarregadas) {
      const camposDependentes = [
        'numero_contrato',
        'unidade_cliente', 
        'setor_unidade_cliente',
        'nome_responsavel_aprovacao_os_cliente',
        'nome_solicitante_cliente'
      ];

      setTimeout(() => {
        camposDependentes.forEach(campo => {
          const valor = watchedValues[campo];
          if (valor) {
            trigger(campo);
          }
        });
      }, 200);
    }
  }, [
    osId, 
    hasLoadedInitialData, 
    isLoadingExistingData,
    opcoes.contratos?.length,
    opcoes.unidades?.length,
    opcoes.setores?.length,
    responsaveis.aprovadores?.length,
    responsaveis.solicitantes?.length
  ]);



  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {(loading || isLoadingExistingData || isLoadingOptions) && (
            <div className="flex items-center justify-center gap-3 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg mb-4 animate-in slide-in-from-top-1 duration-200">
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-400 mb-1">Carregando dados...</h4>
                <p className="text-sm text-blue-300">
                  {isLoadingExistingData ? 'Carregando Ordem de Serviço...' : 
                   isLoadingOptions ? 'Carregando opções...' : 
                   'Processando...'}
                </p>
              </div>
            </div>
          )}

          {globalError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-400/30 rounded-lg mb-4 animate-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-400 mb-1">Erro de Validação</h4>
                <p className="text-sm text-red-300">{globalError}</p>
              </div>
              <Button
                type="button"
                onClick={() => setGlobalError('')}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors duration-200"
                title="Fechar mensagem"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-400/30 rounded-lg mb-4 animate-in slide-in-from-top-1 duration-200">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-400 mb-1">Sucesso</h4>
                <p className="text-sm text-green-300">{successMessage}</p>
              </div>
              <Button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-md transition-colors duration-200"
                title="Fechar mensagem"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!isQualidade && (
            <>
              <BlocoFormulario title="Bloco 1: Dados da Solicitação">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-row gap-8 w-full">
                    <div className="flex flex-1 items-center gap-2">
                      <LabelObrigatorio htmlFor="data_solicitacao_os" obrigatorio={isFieldRequired({field: 'data_solicitacao_os', grupo, values: watchedValues, opcoes})}>
                        Data de Solicitação da OS :
                      </LabelObrigatorio>
                      <Input
                        id="data_solicitacao_os"
                        type="datetime-local"
                        value={toDatetimeLocal(watchedValues.data_solicitacao_os)}
                        onChange={(e) => handleFieldChange('data_solicitacao_os', e.target.value)}
                        onBlur={() => handleFieldBlur('data_solicitacao_os')}
                        className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 flex-1 min-w-0 transition-colors duration-200 ${
                          fieldValidationStatus.data_solicitacao_os === 'invalid' 
                            ? 'border-red-500 focus:border-red-400' 
                            : fieldValidationStatus.data_solicitacao_os === 'valid'
                            ? 'border-green-500 focus:border-green-400'
                            : 'border-slate-700 focus:border-blue-400'
                        }`}
                        placeholder=""
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <LabelObrigatorio htmlFor="data_emissao_os" obrigatorio={isFieldRequired({field: 'data_emissao_os', grupo, values: watchedValues, opcoes})}>
                        Data de Emissão da OS :
                      </LabelObrigatorio>
                      <Input
                        id="data_emissao_os"
                        type="datetime-local"
                        value={toDatetimeLocal(watchedValues.data_emissao_os)}
                        onChange={(e) => handleFieldChange('data_emissao_os', e.target.value)}
                        onBlur={() => handleFieldBlur('data_emissao_os')}
                        className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 flex-1 min-w-0 transition-colors duration-200 ${
                          fieldValidationStatus.data_emissao_os === 'invalid' 
                            ? 'border-red-500 focus:border-red-400' 
                            : fieldValidationStatus.data_emissao_os === 'valid'
                            ? 'border-green-500 focus:border-green-400'
                            : 'border-slate-700 focus:border-blue-400'
                        }`}
                        placeholder=""
                      />
                    </div>
                  </div>
                  <div className="flex flex-row gap-4">
                    {(errors.data_solicitacao_os || realTimeErrors.data_solicitacao_os) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm flex-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.data_solicitacao_os?.message || realTimeErrors.data_solicitacao_os)}</span>
                      </div>
                    )}
                    {(errors.data_emissao_os || realTimeErrors.data_emissao_os) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm flex-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.data_emissao_os?.message || realTimeErrors.data_emissao_os)}</span>
                      </div>
                    )}
                  </div>
                  <hr className="my-4 border-slate-700" />
                  <FormsetField
                    name="documentos_solicitacao"
                    title={formsetConfigs.documentos_solicitacao.title}
                    fields={formsetConfigs.documentos_solicitacao.fields}
                    value={watchedValues.documentos_solicitacao}
                    onChange={(value) => setValue('documentos_solicitacao', value)}
                    isFieldRequired={isFieldRequiredWithOptions}
                    watchedValues={watchedValues}
                    grupo={grupo}
                    opcoes={opcoes}
                    errors={errors}
                  />
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 2: Informações do Cliente">
                <div className="flex flex-col w-full">
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex flex-col flex-1 min-w-[200px] max-w-[350px] mx-auto">
                      <LabelObrigatorio htmlFor="nome_cliente" obrigatorio={isFieldRequired({field: 'nome_cliente', grupo, values: watchedValues, opcoes})}>
                        <span className="w-full text-center block">Nome do Cliente :</span>
                      </LabelObrigatorio>
                      <Select onValueChange={(value) => {
                        handleClienteChange(value);
                        handleFieldChange('nome_cliente', value);
                      }} value={watchedValues.nome_cliente ? String(watchedValues.nome_cliente) : ''}>
                        <SelectTrigger id="nome_cliente" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                          fieldValidationStatus.nome_cliente === 'invalid' 
                            ? 'border-red-500 focus:border-red-400' 
                            : fieldValidationStatus.nome_cliente === 'valid'
                            ? 'border-green-500 focus:border-green-400'
                            : 'border-slate-700 focus:border-blue-400'
                        }`}>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border border-slate-700">
                          {opcoes.clientes && opcoes.clientes.length > 0 ? (
                            opcoes.clientes.map((cliente) => (
                              <SelectItem key={cliente.id} value={String(cliente.id)} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">
                                {cliente.nome}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {(errors.nome_cliente || realTimeErrors.nome_cliente) && (
                        <div className="flex items-center justify-center gap-1 text-red-400 text-sm">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span>{String(errors.nome_cliente?.message || realTimeErrors.nome_cliente)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-[200px] max-w-[350px] mx-auto">
                      <LabelObrigatorio htmlFor="numero_contrato" obrigatorio={isFieldRequired({field: 'numero_contrato', grupo, values: watchedValues, opcoes})}>
                        <span className="w-full text-center block">Número do Contrato :</span>
                      </LabelObrigatorio>
                      <Select 
                        value={watchedValues.numero_contrato || ''} 
                        onValueChange={(value) => handleFieldChange('numero_contrato', value)}
                      >
                        <SelectTrigger id="numero_contrato" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                          fieldValidationStatus.numero_contrato === 'invalid' 
                            ? 'border-red-500 focus:border-red-400' 
                            : fieldValidationStatus.numero_contrato === 'valid'
                            ? 'border-green-500 focus:border-green-400'
                            : 'border-slate-700 focus:border-blue-400'
                        }`}>
                          <SelectValue placeholder="Selecione o contrato" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border border-slate-700">
                          {opcoes.contratos && opcoes.contratos.length > 0 ? (
                            opcoes.contratos.map((contrato, idx) => {
                              const value = typeof contrato === 'object' && contrato !== null ? String(contrato.id) : String(idx);
                              const key = typeof contrato === 'object' && contrato !== null && contrato.id !== undefined ? contrato.id : idx;
                              const label = typeof contrato === 'object' && contrato !== null ? contrato.nome : contrato;
                              return (
                                <SelectItem key={key} value={value} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">
                                  {label}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {(errors.numero_contrato || realTimeErrors.numero_contrato) && (
                        <div className="flex items-center justify-center gap-1 text-red-400 text-sm">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span>{String(errors.numero_contrato?.message || realTimeErrors.numero_contrato)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-[200px] max-w-[350px] mx-auto">
                      <LabelObrigatorio htmlFor="unidade_cliente" obrigatorio={isFieldRequired({field: 'unidade_cliente', grupo, values: watchedValues, opcoes})}>
                        <span className="w-full text-center block">Unidade do Cliente :</span>
                      </LabelObrigatorio>
                      <Select 
                        value={watchedValues.unidade_cliente || ''} 
                        onValueChange={(value) => handleFieldChange('unidade_cliente', value)}
                      >
                        <SelectTrigger id="unidade_cliente" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                          fieldValidationStatus.unidade_cliente === 'invalid' 
                            ? 'border-red-500 focus:border-red-400' 
                            : fieldValidationStatus.unidade_cliente === 'valid'
                            ? 'border-green-500 focus:border-green-400'
                            : 'border-slate-700 focus:border-blue-400'
                        }`}>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border border-slate-700">
                          {opcoes.unidades && opcoes.unidades.length > 0 ? (
                            opcoes.unidades.map((unidade, idx) => {
                              const value = typeof unidade === 'object' && unidade !== null ? String(unidade.id) : String(idx);
                              const key = typeof unidade === 'object' && unidade !== null && unidade.id !== undefined ? unidade.id : idx;
                              const label = typeof unidade === 'object' && unidade !== null ? unidade.nome : unidade;
                              return (
                                <SelectItem key={key} value={value} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">
                                  {label}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.unidade_cliente && (
                        <div className="flex items-center justify-center gap-1 text-red-400 text-sm">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span>{String(errors.unidade_cliente?.message)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-[200px] max-w-[350px] mx-auto">
                      <LabelObrigatorio htmlFor="setor_unidade_cliente" obrigatorio={isFieldRequired({field: 'setor_unidade_cliente', grupo, values: watchedValues, opcoes})}>
                        <span className="w-full text-center block">Setor da Unidade do Cliente :</span>
                      </LabelObrigatorio>
                      <Select 
                        value={watchedValues.setor_unidade_cliente || ''} 
                        onValueChange={(value) => handleFieldChange('setor_unidade_cliente', value)}
                      >
                        <SelectTrigger id="setor_unidade_cliente" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                          fieldValidationStatus.setor_unidade_cliente === 'invalid' 
                            ? 'border-red-500 focus:border-red-400' 
                            : fieldValidationStatus.setor_unidade_cliente === 'valid'
                            ? 'border-green-500 focus:border-green-400'
                            : 'border-slate-700 focus:border-blue-400'
                        }`}>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border border-slate-700">
                          {opcoes.setores && opcoes.setores.length > 0 ? (
                            opcoes.setores.map((setor, idx) => {
                              const value = typeof setor === 'object' && setor !== null ? String(setor.id) : String(idx);
                              const key = typeof setor === 'object' && setor !== null && setor.id !== undefined ? setor.id : idx;
                              const label = typeof setor === 'object' && setor !== null ? setor.nome : setor;
                              return (
                                <SelectItem key={key} value={value} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">
                                  {label}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {(errors.setor_unidade_cliente || realTimeErrors.setor_unidade_cliente) && (
                        <div className="flex items-center justify-center gap-1 text-red-400 text-sm">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span>{String(errors.setor_unidade_cliente?.message || realTimeErrors.setor_unidade_cliente)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 3: Prazos e Datas de Entrega">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-row items-center gap-2 w-full">
                    <LabelObrigatorio htmlFor="prazo_execucao_servico" obrigatorio={isFieldRequired({field: 'prazo_execucao_servico', grupo, values: watchedValues, opcoes})} className="whitespace-nowrap">
                      Prazo de Execução do Serviço :
                    </LabelObrigatorio>
                    <Input
                      id="prazo_execucao_servico"
                      type="datetime-local"
                      value={toDatetimeLocal(watchedValues.prazo_execucao_servico)}
                      onChange={(e) => handleFieldChange('prazo_execucao_servico', e.target.value)}
                      onBlur={() => handleFieldBlur('prazo_execucao_servico')}
                      className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 flex-1 min-w-0 transition-colors duration-200 ${
                        fieldValidationStatus.prazo_execucao_servico === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.prazo_execucao_servico === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}
                      placeholder=""
                    />
                    {(errors.prazo_execucao_servico || realTimeErrors.prazo_execucao_servico) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.prazo_execucao_servico?.message || realTimeErrors.prazo_execucao_servico)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center gap-1 w-full">
                    <LabelObrigatorio htmlFor="status_regime_os" obrigatorio={isFieldRequired({field: 'status_regime_os', grupo, values: watchedValues, opcoes})} className="whitespace-nowrap">
                      Prioridade da OS :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('status_regime_os', value)} value={watchedValues.status_regime_os || ''}>
                      <SelectTrigger id="status_regime_os" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 flex-1 min-w-0 transition-colors duration-200 ${
                        fieldValidationStatus.status_regime_os === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.status_regime_os === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o regime">
                          {watchedValues.status_regime_os && opcoes.regimesOS ? 
                            opcoes.regimesOS.find(r => String(r.id) === String(watchedValues.status_regime_os))?.nome || '' : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {opcoes.regimesOS && opcoes.regimesOS.length > 0 ? (
                          opcoes.regimesOS.map((regime) => (
                            <SelectItem key={regime.id} value={String(regime.id)}>
                              {regime.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-500">Nenhum regime encontrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.status_regime_os || realTimeErrors.status_regime_os) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.status_regime_os?.message || realTimeErrors.status_regime_os)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="my-6 border-slate-600" />

                <FormsetField
                  name="datas_previstas"
                  title={formsetConfigs.datas_previstas.title}
                  fields={formsetConfigs.datas_previstas.fields}
                  value={watchedValues.datas_previstas}
                  onChange={(value) => setValue('datas_previstas', value)}
                  isFieldRequired={isFieldRequiredWithOptions}
                  watchedValues={watchedValues}
                  grupo={grupo}
                  opcoes={opcoes}
                  errors={errors}
                />
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 4: Responsáveis pela Ordem">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="nome_diligenciador_os" obrigatorio={isFieldRequired({field: 'nome_diligenciador_os', grupo, values: watchedValues, opcoes})}>
                      Diligenciador da OS :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('nome_diligenciador_os', value)} value={watchedValues.nome_diligenciador_os ? String(watchedValues.nome_diligenciador_os) : ''}>
                      <SelectTrigger id="nome_diligenciador_os" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.nome_diligenciador_os === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.nome_diligenciador_os === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {responsaveis.diligenciadores.length === 0 ? (
                          <SelectItem value="no-data" disabled className="text-gray-500">Nenhum diligenciador encontrado</SelectItem>
                        ) : (
                          responsaveis.diligenciadores.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">{p.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.nome_diligenciador_os || realTimeErrors.nome_diligenciador_os) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.nome_diligenciador_os?.message || realTimeErrors.nome_diligenciador_os)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="nome_responsavel_execucao_servico" obrigatorio={isFieldRequired({field: 'nome_responsavel_execucao_servico', grupo, values: watchedValues, opcoes})}>
                      Responsável pelo Serviço :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('nome_responsavel_execucao_servico', value)} value={watchedValues.nome_responsavel_execucao_servico ? String(watchedValues.nome_responsavel_execucao_servico) : ''}>
                      <SelectTrigger id="nome_responsavel_execucao_servico" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.nome_responsavel_execucao_servico === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.nome_responsavel_execucao_servico === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {responsaveis.executores.length === 0 ? (
                          <SelectItem value="no-data" disabled className="text-gray-500">Nenhum executor encontrado</SelectItem>
                        ) : (
                          responsaveis.executores.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">{p.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.nome_responsavel_execucao_servico || realTimeErrors.nome_responsavel_execucao_servico) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.nome_responsavel_execucao_servico?.message || realTimeErrors.nome_responsavel_execucao_servico)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="nome_solicitante_cliente" obrigatorio={isFieldRequired({field: 'nome_solicitante_cliente', grupo, values: watchedValues, opcoes})}>
                      Solicitante do Cliente :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('nome_solicitante_cliente', value)} value={watchedValues.nome_solicitante_cliente ? String(watchedValues.nome_solicitante_cliente) : ''}>
                      <SelectTrigger id="nome_solicitante_cliente" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.nome_solicitante_cliente === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.nome_solicitante_cliente === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {(responsaveis.solicitantes || []).length > 0 ? (
                          (responsaveis.solicitantes || []).map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">
                              {p.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.nome_solicitante_cliente || realTimeErrors.nome_solicitante_cliente) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.nome_solicitante_cliente?.message || realTimeErrors.nome_solicitante_cliente)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="nome_responsavel_aprovacao_os_cliente" obrigatorio={isFieldRequired({field: 'nome_responsavel_aprovacao_os_cliente', grupo, values: watchedValues, opcoes})}>
                      Aprovador do Cliente :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('nome_responsavel_aprovacao_os_cliente', value)} value={watchedValues.nome_responsavel_aprovacao_os_cliente ? String(watchedValues.nome_responsavel_aprovacao_os_cliente) : ''}>
                      <SelectTrigger id="nome_responsavel_aprovacao_os_cliente" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.nome_responsavel_aprovacao_os_cliente === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.nome_responsavel_aprovacao_os_cliente === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {(responsaveis.aprovadores || []).length > 0 ? (
                          (responsaveis.aprovadores || []).map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">
                              {p.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.nome_responsavel_aprovacao_os_cliente || realTimeErrors.nome_responsavel_aprovacao_os_cliente) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.nome_responsavel_aprovacao_os_cliente?.message || realTimeErrors.nome_responsavel_aprovacao_os_cliente)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 5: Detalhes da Demanda">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-row items-center gap-2 w-full">
                    <LabelObrigatorio htmlFor="id_demanda" obrigatorio={isFieldRequired({field: 'id_demanda', grupo, values: watchedValues, opcoes})} className="whitespace-nowrap">
                      Identificação da Demanda :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('id_demanda', value)} value={watchedValues.id_demanda ? String(watchedValues.id_demanda) : ''}>
                      <SelectTrigger id="id_demanda" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 flex-1 min-w-0 transition-colors duration-200 ${
                        fieldValidationStatus.id_demanda === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.id_demanda === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione a demanda" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {opcoesDinamicas.demandas && opcoesDinamicas.demandas.length > 0 ? (
                          opcoesDinamicas.demandas.map((demanda) => (
                            <SelectItem key={demanda.id} value={String(demanda.id)}>{demanda.nome}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.id_demanda || realTimeErrors.id_demanda) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.id_demanda?.message || realTimeErrors.id_demanda)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center gap-2 w-full">
                    <LabelObrigatorio htmlFor="descricao_resumida" obrigatorio={isFieldRequired({field: 'descricao_resumida', grupo, values: watchedValues, opcoes})} className="whitespace-nowrap">
                      Descrição Resumida :
                    </LabelObrigatorio>
                    <Textarea
                      id="descricao_resumida"
                      value={watchedValues.descricao_resumida || ''}
                      onChange={(e) => handleFieldChange('descricao_resumida', e.target.value)}
                      onBlur={() => handleFieldBlur('descricao_resumida')}
                      className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 flex-1 min-w-0 transition-colors duration-200 ${
                        fieldValidationStatus.descricao_resumida === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.descricao_resumida === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}
                      placeholder="Digite uma descrição resumida da demanda"
                    />
                    {(errors.descricao_resumida || realTimeErrors.descricao_resumida) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.descricao_resumida?.message || realTimeErrors.descricao_resumida)}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <LabelObrigatorio htmlFor="descricao_detalhada" obrigatorio={isFieldRequired({field: 'descricao_detalhada', grupo, values: watchedValues, opcoes})}>
                      Descrição Detalhada :
                    </LabelObrigatorio>
                    <Textarea
                      id="descricao_detalhada"
                      value={watchedValues.descricao_detalhada || ''}
                      onChange={(e) => handleFieldChange('descricao_detalhada', e.target.value)}
                      onBlur={() => handleFieldBlur('descricao_detalhada')}
                      className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.descricao_detalhada === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.descricao_detalhada === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}
                      placeholder="Digite uma descrição detalhada da demanda"
                      rows={4}
                    />
                    {(errors.descricao_detalhada || realTimeErrors.descricao_detalhada) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.descricao_detalhada?.message || realTimeErrors.descricao_detalhada)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <FormsetField
                  name="acoes_solicitacao"
                  title={formsetConfigs.acoes_solicitacao.title}
                  fields={formsetConfigs.acoes_solicitacao.fields}
                  value={watchedValues.acoes_solicitacao}
                  onChange={(value) => setValue('acoes_solicitacao', value)}
                  isFieldRequired={isFieldRequiredWithOptions}
                  watchedValues={watchedValues}
                  grupo={grupo}
                  opcoes={{ ...opcoes, acoes: (opcoesDinamicas.acoes || []).map(a => ({ value: a.id, label: a.descricao })) }}
                  errors={errors}
                />
              </BlocoFormulario>
            </>
          )}

          <BlocoFormulario title="Bloco 6: Controle de Qualidade">
            <AccordionFormset
              name="controles"
              title={<span>{formsetConfigs.controles.title}</span>}
              fields={formsetConfigs.controles.fields}
              value={watchedValues.controles}
              onChange={(value) => setValue('controles', value)}
              isFieldRequired={isFieldRequiredWithOptions}
              watchedValues={watchedValues}
              grupo={grupo}
              opcoes={{ 
                tipos_cq: (opcoesDinamicas.tiposCQ || []).map(t => ({ value: t.id, label: t.nome })),
                especs_cq: watchedValues.nome_cliente
                  ? (opcoes.especs_cq || []).map(es => (typeof es === 'object' ? { value: es.id ?? es.value ?? es, label: es.nome ?? es.label ?? es } : { value: es, label: es }))
                  : [],
                niveis_cq: (opcoesDinamicas.niveisCQ || []).map(n => ({ value: n.id, label: n.nome })),
                ensaios_cq: (opcoesDinamicas.ensaiosCQ || []).map(e => ({ value: e.id, label: e.nome })),
                percentuais: (opcoesDinamicas.percentuais || []).map(p => ({ value: String(p.id), label: String(p.nome) })),
                diligenciadores: (responsaveis.diligenciadores || []).map(p => ({ value: p.id, label: p.nome })),
                executores: (responsaveis.executores || []).map(p => ({ value: p.id, label: p.nome })),
                demandas: (opcoes.demandas || []).map(d => ({ value: d.id, label: d.nome })),
              }}
            />
          </BlocoFormulario>

          {!isQualidade && (
            <>
              <BlocoFormulario title="Bloco 7: Orçamento e Valores">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2 flex flex-col items-center">
                    <LabelObrigatorio htmlFor="existe_orcamento" obrigatorio={isFieldRequired({field: 'existe_orcamento', grupo, values: watchedValues, opcoes})}>
                      <span className="block text-center w-full">Existe Orçamento?</span>
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('existe_orcamento', value)} value={watchedValues.existe_orcamento || ''}>
                      <SelectTrigger id="existe_orcamento" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                        fieldValidationStatus.existe_orcamento === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.existe_orcamento === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex flex-col items-center">
                    <LabelObrigatorio htmlFor="peso_fabricacao" obrigatorio={isFieldRequired({field: 'peso_fabricacao', grupo, values: watchedValues, opcoes})}>
                      <span className="block text-center w-full">Peso de Fabricação :</span>
                    </LabelObrigatorio>
                    <Input
                      id="peso_fabricacao"
                      type="text"
                      value={pesoInputs.peso_fabricacao ?? ''}
                      onChange={(e) => handleWeightChange('peso_fabricacao', e.target.value)}
                      onBlur={() => handleWeightBlur('peso_fabricacao')}
                      onFocus={() => handleWeightFocus('peso_fabricacao')}
                      className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                        fieldValidationStatus.peso_fabricacao === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.peso_fabricacao === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}
                      placeholder="0,00 kg"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col items-center">
                    <LabelObrigatorio htmlFor="metro_quadrado_pintura_revestimento" obrigatorio={isFieldRequired({field: 'metro_quadrado_pintura_revestimento', grupo, values: watchedValues, opcoes})}>
                      <span className="block text-center w-full whitespace-nowrap">Metro Quadrado de Pintura/Revestimento :</span>
                    </LabelObrigatorio>
                    <Input
                      id="metro_quadrado_pintura_revestimento"
                      type="text"
                      value={metroQuadradoInputs.metro_quadrado_pintura_revestimento ?? ''}
                      onChange={(e) => handleSquareMeterChange('metro_quadrado_pintura_revestimento', e.target.value)}
                      onBlur={() => handleSquareMeterBlur('metro_quadrado_pintura_revestimento')}
                      onFocus={() => handleSquareMeterFocus('metro_quadrado_pintura_revestimento')}
                      className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                        fieldValidationStatus.metro_quadrado_pintura_revestimento === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.metro_quadrado_pintura_revestimento === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}
                      placeholder="0,00 m²"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {watchedValues.existe_orcamento === 'SIM' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-cyan-600 border-b border-gray-200 pb-2">Valores do Orçamento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {[
                        { label: 'Fabricação', havera: 'havera_valor_fabricacao', valor: 'valor_fabricacao' },
                        { label: 'Levantamento', havera: 'havera_valor_levantamento', valor: 'valor_levantamento' },
                        { label: 'Material de Fabricação', havera: 'havera_valor_material_fabricacao', valor: 'valor_material_fabricacao' },
                        { label: 'Material de Pintura', havera: 'havera_valor_material_pintura', valor: 'valor_material_pintura' },
                        { label: 'Serviço de Pintura', havera: 'havera_valor_servico_pintura_revestimento', valor: 'valor_servico_pintura_revestimento' },
                        { label: 'Material de Montagem', havera: 'havera_valor_material_montagem', valor: 'valor_material_montagem' },
                        { label: 'Montagem', havera: 'havera_valor_montagem', valor: 'valor_montagem' },
                        { label: 'Inspeção', havera: 'havera_valor_inspecao', valor: 'valor_inspecao' },
                        { label: 'Manut. Válvula', havera: 'havera_valor_manutencao_valvula', valor: 'valor_manutencao_valvula' },
                        { label: 'Serviço Terceiros', havera: 'havera_valor_servico_terceiros', valor: 'valor_servico_terceiros' },
                      ].map(({ label, havera, valor }) => (
                        <div key={valor} className="grid grid-cols-2 gap-2 items-end">
                          <div className="flex flex-col gap-1">
                            <LabelObrigatorio htmlFor={havera} obrigatorio={isFieldRequired({field: havera, grupo, values: watchedValues, opcoes})}>
                              {`Haverá ${label}?`}
                            </LabelObrigatorio>
                            <Select onValueChange={(value) => setValue(havera, value)} value={watchedValues[havera]}>
                              <SelectTrigger id={havera} className="bg-slate-800 text-white border border-slate-700 placeholder:text-gray-400 rounded-md p-2">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 text-white border border-slate-700">
                                <SelectItem value="SIM">Sim</SelectItem>
                                <SelectItem value="NAO">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {watchedValues[havera] === 'SIM' ? (
                            <div className="flex flex-col gap-1">
                              <LabelObrigatorio htmlFor={valor} obrigatorio={isFieldRequired({field: valor, grupo, values: watchedValues, opcoes})}>
                                <span className="block text-center w-full">{`Valor ${label} :`}</span>
                              </LabelObrigatorio>
                              <Input
                                id={valor}
                                type="text"
                                value={valorInputs[valor] ?? ''}
                                onChange={(e) => handleCurrencyChange(valor, e.target.value)}
                                onBlur={() => handleCurrencyBlur(valor)}
                                onFocus={() => handleCurrencyFocus(valor)}
                                className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 w-full transition-colors duration-200 ${
                                  fieldValidationStatus[valor] === 'invalid' 
                                    ? 'border-red-500 focus:border-red-400' 
                                    : fieldValidationStatus[valor] === 'valid'
                                    ? 'border-green-500 focus:border-green-400'
                                    : 'border-slate-700 focus:border-blue-400'
                                }`}
                                placeholder="R$ 0,00"
                                disabled={isValueFieldDisabled(watch(havera))}
                                autoComplete="off"
                              />
                              {(errors[valor] || realTimeErrors[valor]) && (
                                <div className="flex items-center gap-1 text-red-400 text-sm">
                                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                  <span>{String(errors[valor]?.message || realTimeErrors[valor])}</span>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-white-600 text-center w-full block">
                            Soma Total dos Valores
                          </Label>
                          <div className="bg-slate-800 p-3 rounded border border-slate-700 text-white font-semibold text-lg">
                            {formatCurrency(watchedValues.soma_valores)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-white-600 text-center w-full block">
                            Previsão de Finalização de Serviço
                          </Label>
                          <div className="bg-slate-800 p-3 rounded border border-slate-700 text-white font-semibold text-lg text-center">
                            {hhPrevisao}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 8: Status e Assinaturas">
                {/* Selects do topo com larguras padronizadas - baseadas no Status da OS Eletrônica */}
                <div className="space-y-4 mb-6 bloco-8-top-selects">
                  <div className="flex flex-col space-y-2 bloco-8-select-item">
                    <LabelObrigatorio htmlFor="status_os" obrigatorio={isFieldRequired({field: 'status_os', grupo, values: watchedValues, opcoes})}>
                      Status da OS :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('status_os', value)} value={watchedValues.status_os || ''}>
                      <SelectTrigger id="status_os" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.status_os === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.status_os === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o status">
                          {getStatusName(watchedValues.status_os, opcoes.status_os)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {opcoes.status_os && opcoes.status_os.length > 0 ? (
                          opcoes.status_os.map((status) => (
                            <SelectItem key={status.id} value={String(status.id)}>
                              {status.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-500">Nenhum status encontrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.status_os || realTimeErrors.status_os) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.status_os?.message || realTimeErrors.status_os)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Novos campos condicionais do Bloco 8 */}
                {isStatusPermiteOrdensDocumentos(watchedValues.status_os, opcoes) && (
                  <div className="space-y-6">
                    {/* Linha 1: Status da OS Manual e Data de Aprovação da Assinatura Manual */}
                    <div className="flex flex-col lg:flex-row gap-4 bloco-8-manual-row">
                      {/* Status da OS Manual - largura fixa baseada no Status da OS Eletrônica */}
                      <div className="flex flex-col space-y-2 bloco-8-field bloco-8-select-item">
                        <LabelObrigatorio htmlFor="status_os_manual" obrigatorio={isFieldRequired({field: 'status_os_manual', grupo, values: watchedValues, opcoes})}>
                          Status da OS Manual :
                        </LabelObrigatorio>
                        <Select onValueChange={(value) => handleFieldChange('status_os_manual', value)} value={watchedValues.status_os_manual || ''}>
                          <SelectTrigger id="status_os_manual" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                            fieldValidationStatus.status_os_manual === 'invalid' 
                              ? 'border-red-500 focus:border-red-400' 
                              : fieldValidationStatus.status_os_manual === 'valid'
                              ? 'border-green-500 focus:border-green-400'
                              : 'border-slate-700 focus:border-blue-400'
                          }`}>
                            <SelectValue placeholder="Selecione o status manual" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 text-white border border-slate-700">
                            {opcoesDinamicas.statusOSManual && opcoesDinamicas.statusOSManual.length > 0 ? (
                              opcoesDinamicas.statusOSManual.map((status) => (
                                <SelectItem key={status.id} value={String(status.id)}>{status.nome}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {(errors.status_os_manual || realTimeErrors.status_os_manual) && (
                          <div className="flex items-center gap-1 text-red-400 text-sm">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span>{String(errors.status_os_manual?.message || realTimeErrors.status_os_manual)}</span>
                          </div>
                        )}
                      </div>

                                              {/* Campo dependente do status manual - mesma largura dos campos de data do grid */}
                        {(() => {
                          // Verificar se o status manual é "APROVADO" usando a função com variações
                          const isStatusManualAprovado = isStatusAprovado(watchedValues.status_os_manual, opcoes.status_os_manual);
                          return isStatusManualAprovado;
                        })() && (
                          <div className="flex flex-col space-y-2 bloco-8-field bloco-8-expandable-field bloco-8-date-field">
                            <LabelObrigatorio htmlFor="data_aprovacao_assinatura_manual" obrigatorio={isFieldRequired({field: 'data_aprovacao_assinatura_manual', grupo, values: watchedValues, opcoes})}>
                              Data de Aprovação da Assinatura Manual :
                            </LabelObrigatorio>
                            <Input
                              id="data_aprovacao_assinatura_manual"
                              type="datetime-local"
                              value={toDatetimeLocal(watchedValues.data_aprovacao_assinatura_manual)}
                              onChange={(e) => handleFieldChange('data_aprovacao_assinatura_manual', e.target.value)}
                              onBlur={() => handleFieldBlur('data_aprovacao_assinatura_manual')}
                              className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                                fieldValidationStatus.data_aprovacao_assinatura_manual === 'invalid' 
                                  ? 'border-red-500 focus:border-red-400' 
                                  : fieldValidationStatus.data_aprovacao_assinatura_manual === 'valid'
                                  ? 'border-green-500 focus:border-green-400'
                                  : 'border-slate-700 focus:border-blue-400'
                              }`}
                              placeholder=""
                            />
                            {(errors.data_aprovacao_assinatura_manual || realTimeErrors.data_aprovacao_assinatura_manual) && (
                              <div className="flex items-center gap-1 text-red-400 text-sm">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                <span>{String(errors.data_aprovacao_assinatura_manual?.message || realTimeErrors.data_aprovacao_assinatura_manual)}</span>
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Linha 2: Status da OS Eletrônica, Data de Assinatura Eletrônica e Número da OS Eletrônica */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bloco-8-grid-row bloco-8-grid-row-3">
                      {/* Status da OS Eletrônica - largura base para todos os selects */}
                      <div className="flex flex-col space-y-2 bloco-8-field bloco-8-select-item">
                        <LabelObrigatorio htmlFor="status_os_eletronica" obrigatorio={isFieldRequired({field: 'status_os_eletronica', grupo, values: watchedValues, opcoes})}>
                          Status da OS Eletrônica :
                        </LabelObrigatorio>
                        <Select onValueChange={(value) => handleFieldChange('status_os_eletronica', value)} value={watchedValues.status_os_eletronica || ''}>
                          <SelectTrigger id="status_os_eletronica" className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                            fieldValidationStatus.status_os_eletronica === 'invalid' 
                              ? 'border-red-500 focus:border-red-400' 
                              : fieldValidationStatus.status_os_eletronica === 'valid'
                              ? 'border-green-500 focus:border-green-400'
                              : 'border-slate-700 focus:border-blue-400'
                          }`}>
                            <SelectValue placeholder="Selecione o status eletrônico" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 text-white border border-slate-700">
                            {opcoesDinamicas.statusOSEletronica && opcoesDinamicas.statusOSEletronica.length > 0 ? (
                              opcoesDinamicas.statusOSEletronica.map((status) => (
                                <SelectItem key={status.id} value={String(status.id)}>{status.nome}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {(errors.status_os_eletronica || realTimeErrors.status_os_eletronica) && (
                          <div className="flex items-center gap-1 text-red-400 text-sm">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span>{String(errors.status_os_eletronica?.message || realTimeErrors.status_os_eletronica)}</span>
                          </div>
                        )}
                      </div>

                      {/* Campos dependentes do status eletrônico */}
                      {(() => {
                        // Verificar se o status eletrônico é "APROVADO" usando a função com variações
                        const isStatusEletronicaAprovado = isStatusAprovado(watchedValues.status_os_eletronica, opcoes.status_os_eletronica);
                        return isStatusEletronicaAprovado;
                      })() && (
                        <>
                          <div className="flex flex-col space-y-2 bloco-8-field bloco-8-date-field">
                            <LabelObrigatorio htmlFor="data_assinatura_eletronica_os" obrigatorio={isFieldRequired({field: 'data_assinatura_eletronica_os', grupo, values: watchedValues, opcoes})}>
                              Data de Assinatura Eletrônica da OS :
                            </LabelObrigatorio>
                            <Input
                              id="data_assinatura_eletronica_os"
                              type="datetime-local"
                              value={toDatetimeLocal(watchedValues.data_assinatura_eletronica_os)}
                              onChange={(e) => handleFieldChange('data_assinatura_eletronica_os', e.target.value)}
                              onBlur={() => handleFieldBlur('data_assinatura_eletronica_os')}
                              className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                                fieldValidationStatus.data_assinatura_eletronica_os === 'invalid' 
                                  ? 'border-red-500 focus:border-red-400' 
                                  : fieldValidationStatus.data_assinatura_eletronica_os === 'valid'
                                  ? 'border-green-500 focus:border-green-400'
                                  : 'border-slate-700 focus:border-blue-400'
                              }`}
                              placeholder=""
                            />
                            {(errors.data_assinatura_eletronica_os || realTimeErrors.data_assinatura_eletronica_os) && (
                              <div className="flex items-center gap-1 text-red-400 text-sm">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                <span>{String(errors.data_assinatura_eletronica_os?.message || realTimeErrors.data_assinatura_eletronica_os)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col space-y-2 bloco-8-field">
                            <LabelObrigatorio htmlFor="numero_os_eletronica" obrigatorio={isFieldRequired({field: 'numero_os_eletronica', grupo, values: watchedValues, opcoes})}>
                              Número da OS Eletrônica :
                            </LabelObrigatorio>
                            <Input
                              id="numero_os_eletronica"
                              type="number"
                              value={watchedValues.numero_os_eletronica || ''}
                              onChange={(e) => handleFieldChange('numero_os_eletronica', e.target.value)}
                              onBlur={() => handleFieldBlur('numero_os_eletronica')}
                              className={`w-full bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                                fieldValidationStatus.numero_os_eletronica === 'invalid' 
                                  ? 'border-red-500 focus:border-red-400' 
                                  : fieldValidationStatus.numero_os_eletronica === 'valid'
                                  ? 'border-green-500 focus:border-green-400'
                                  : 'border-slate-700 focus:border-blue-400'
                              }`}
                              placeholder="Digite o número da OS eletrônica"
                            />
                            {(errors.numero_os_eletronica || realTimeErrors.numero_os_eletronica) && (
                              <div className="flex items-center gap-1 text-red-400 text-sm">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                <span>{String(errors.numero_os_eletronica?.message || realTimeErrors.numero_os_eletronica)}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isStatusPermiteOrdensDocumentos(watchedValues.status_os, opcoes) && (
                  <div className="space-y-4 mt-4 p-4 bg-slate-70 rounded-lg border">                    
                    <FormsetField
                      name="ordens"
                      title="Ordens do Cliente"
                      fields={[{ name: 'numero_ordem', label: 'Número da Ordem :', type: 'number' }]}
                      value={watchedValues.ordens}
                      onChange={(value) => setValue('ordens', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                      errors={errors}
                    />

                    <FormsetField
                      name="documentos"
                      title="Documentos de Entrada"
                      fields={[
                        { name: 'documento_entrada', label: 'Arquivo :', type: 'file' },
                        { name: 'numero_documento_entrada', label: 'Número :', type: 'number' },
                        { name: 'data_documento_entrada', label: 'Data :', type: 'datetime-local' }
                      ]}
                      value={watchedValues.documentos}
                      onChange={(value) => setValue('documentos', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                      errors={errors}
                    />
                  </div>
                )}
              </BlocoFormulario>
              {/* Condicional global: ocultar blocos 9-14 quando status for "Cancelada" */}
              {(() => {
                const isStatusCanceladaValue = isStatusCancelada(watchedValues.status_os, opcoes);
                return !isStatusCanceladaValue;
              })() && (
                <>
                  <BlocoFormulario title="Bloco 9: Levantamento e Materiais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="status-container"> {/* NOVA CLASSE FLEX */}
                    <LabelObrigatorio htmlFor="status_levantamento" obrigatorio={isFieldRequired({field: 'status_levantamento', grupo, values: watchedValues, opcoes})}>
                      Status do Levantamento :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('status_levantamento', value)} value={watchedValues.status_levantamento || ''}>
                      <SelectTrigger id="status_levantamento" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.status_levantamento === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.status_levantamento === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o status">
                          {getStatusName(watchedValues.status_levantamento, opcoes.status_levantamento)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {opcoes.status_levantamento && opcoes.status_levantamento.length > 0 ? (
                          opcoes.status_levantamento.map((status) => (
                            <SelectItem key={status.id} value={String(status.id)}>
                              {status.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-500">Nenhum status encontrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(errors.status_levantamento || realTimeErrors.status_levantamento) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.status_levantamento?.message || realTimeErrors.status_levantamento)}</span>
                      </div>
                    )}
                  </div>

                  <div className="status-container"> {/* NOVA CLASSE FLEX */}
                    <LabelObrigatorio htmlFor="status_producao" obrigatorio={isFieldRequired({field: 'status_producao', grupo, values: watchedValues, opcoes})}>
                      Status da Produção :
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('status_producao', value)} value={watchedValues.status_producao || ''}>
                      <SelectTrigger id="status_producao" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.status_producao === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.status_producao === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione o status">
                          {getStatusName(watchedValues.status_producao, opcoes.status_producao)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        {opcoes.status_producao && opcoes.status_producao.length > 0 ? (
                          opcoes.status_producao.map((status) => (
                            <SelectItem key={status.id} value={String(status.id)}>
                              {status.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-500">Nenhum status encontrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isStatusConcluido(watchedValues.status_levantamento, opcoes, 'levantamento') && (
                  <div className="space-y-4 mt-4">
                    <AccordionFormset
                      name="levantamentos"
                      title={<span>Levantamentos</span>}
                      fields={formsetConfigs.levantamentos.fields}
                      value={watchedValues.levantamentos}
                      onChange={(value) => setValue('levantamentos', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                    />
                  </div>
                )}

                {isStatusConcluido(watchedValues.status_producao, opcoes, 'producao') && (
                  <div className="space-y-4 mt-4">
                    <AccordionFormset
                      name="materiais"
                      title={<span>Materiais</span>}
                      fields={formsetConfigs.materiais.fields}
                      value={watchedValues.materiais}
                      onChange={(value) => setValue('materiais', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={{
                        tiposMaterial: (opcoesDinamicas.tiposMaterial || []).map(t => ({ value: t.id, label: t.nome })),
                        statusMaterial: (opcoesDinamicas.statusMaterial || []).map(s => ({ value: s.id, label: s.nome })),
                        responsaveisMaterial: (opcoesDinamicas.responsaveisMaterial || []).map(p => ({ value: p.id, label: p.nome })),
                      }}
                      key={`materiais-${opcoesDinamicas.statusMaterial?.length || 0}`}
                    />
                  </div>
                )}


              </BlocoFormulario>
              <BlocoFormulario title="Bloco 10: GMI/GME/RTIP/RTM">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <AccordionFormset
                      name="gmis"
                      title={<span>GMI</span>}
                      fields={[
                        { name: 'data_gmi', label: 'Data :', type: 'datetime-local' },
                        { name: 'arquivo_anexo_gmi', label: 'Arquivo :', type: 'file' },
                        { name: 'descricao_gmi', label: 'Descrição :', type: 'textarea', rows: 3 },
                      ]}
                      value={watchedValues.gmis}
                      onChange={(value) => setValue('gmis', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                    />
                  </div>

                  <div className="space-y-4">
                    <AccordionFormset
                      name="rtips"
                      title={<span>RTIP</span>}
                      fields={[
                        { name: 'data_rtip', label: 'Data :', type: 'datetime-local' },
                        { name: 'arquivo_anexo_rtip', label: 'Arquivo :', type: 'file' },
                        { name: 'descricao_rtip', label: 'Descrição :', type: 'textarea', rows: 3 },
                      ]}
                      value={watchedValues.rtips}
                      onChange={(value) => setValue('rtips', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                    />
                  </div>

                  <div className="space-y-4">
                    <AccordionFormset
                      name="gmes"
                      title="GME"
                      fields={[
                        { name: 'data_gme', label: 'Data :', type: 'datetime-local' },
                        { name: 'arquivo_anexo_gme', label: 'Arquivo :', type: 'file' },
                        { name: 'descricao_gme', label: 'Descrição :', type: 'textarea', rows: 3 },
                      ]}
                      value={watchedValues.gmes}
                      onChange={(value) => setValue('gmes', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                    />
                  </div>

                  <div className="space-y-4">
                    <AccordionFormset
                      name="rtms"
                      title="RTM"
                      fields={[
                        { name: 'data_rtm', label: 'Data :', type: 'datetime-local' },
                        { name: 'arquivo_anexo_rtm', label: 'Arquivo :', type: 'file' },
                        { name: 'descricao_rtm', label: 'Descrição :', type: 'textarea', rows: 3 },
                      ]}
                      value={watchedValues.rtms}
                      onChange={(value) => setValue('rtms', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={opcoes}
                    />
                  </div>
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 11: DMS">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="opcoes_dms" obrigatorio={isFieldRequired({field: 'opcoes_dms', grupo, values: watchedValues, opcoes})}>
                      Serviço Concluído ?
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('opcoes_dms', value)} value={watchedValues.opcoes_dms || ''}>
                      <SelectTrigger id="opcoes_dms" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.opcoes_dms === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.opcoes_dms === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchedValues.opcoes_dms === 'SIM' && (
                    <AccordionFormset
                      name="dmss"
                      title={<span>Registros DMS</span>}
                      fields={formsetConfigs.dmss.fields}
                      value={watchedValues.dmss}
                      onChange={(value) => setValue('dmss', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={{
                        statusDMS: (() => {
                          const options = (opcoesDinamicas.statusDMS || []).map(s => ({ value: s.id, label: s.nome }));
                  
                          return options;
                        })(),
                      }}
                    />
                  )}
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 12: BMS">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="opcoes_bms" obrigatorio={isFieldRequired({field: 'opcoes_bms', grupo, values: watchedValues, opcoes})}>
                      DMS Aprovado ?
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('opcoes_bms', value)} value={watchedValues.opcoes_bms || ''}>
                      <SelectTrigger id="opcoes_bms" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.opcoes_bms === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.opcoes_bms === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchedValues.opcoes_bms === 'SIM' && (
                    <AccordionFormset
                      name="bmss"
                      title={<span>Registros BMS</span>}
                      fields={formsetConfigs.bmss.fields}
                      value={watchedValues.bmss}
                      onChange={(value) => setValue('bmss', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={{
                        statusBMS: (() => {
                          const options = (opcoesDinamicas.statusBMS || []).map(s => ({ value: s.id, label: s.nome }));
                  
                          return options;
                        })(),
                      }}
                    />
                  )}
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 13: FRS">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="opcoes_frs" obrigatorio={isFieldRequired({field: 'opcoes_frs', grupo, values: watchedValues, opcoes})}>
                      BMS Aprovado ?
                    </LabelObrigatorio>
                    <Select onValueChange={(value) => handleFieldChange('opcoes_frs', value)} value={watchedValues.opcoes_frs || ''}>
                      <SelectTrigger id="opcoes_frs" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.opcoes_frs === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.opcoes_frs === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchedValues.opcoes_frs === 'SIM' && (
                    <AccordionFormset
                      name="frss"
                      title={<span>Registros FRS</span>}
                      fields={formsetConfigs.frss.fields}
                      value={watchedValues.frss}
                      onChange={(value) => setValue('frss', value)}
                      isFieldRequired={isFieldRequiredWithOptions}
                      watchedValues={watchedValues}
                      grupo={grupo}
                      opcoes={{
                        statusFRS: (() => {
                          const options = (opcoesDinamicas.statusFRS || []).map(s => ({ value: s.id, label: s.nome }));
                  
                          return options;
                        })(),
                      }}
                    />
                  )}
                </div>
              </BlocoFormulario>
              <BlocoFormulario title="Bloco 14: Notas Fiscais">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="opcoes_nf" obrigatorio={isFieldRequired({field: 'opcoes_nf', grupo, values: watchedValues, opcoes})}>
                      FRS Aprovado ?
                    </LabelObrigatorio>
                    <Select 
                      value={watchedValues.opcoes_nf || ''} 
                      onValueChange={(value) => handleFieldChange('opcoes_nf', value)}
                    >
                      <SelectTrigger id="opcoes_nf" className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.opcoes_nf === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.opcoes_nf === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border border-slate-700">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Não</SelectItem>
                      </SelectContent>
                    </Select>
                    {(errors.opcoes_nf || realTimeErrors.opcoes_nf) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.opcoes_nf?.message || realTimeErrors.opcoes_nf)}</span>
                      </div>
                    )}
                  </div>

                  {watchedValues.opcoes_nf === 'SIM' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <AccordionFormset
                          name="nfsaidas"
                          title={<span>Notas Fiscais de Saída</span>}
                          fields={[
                            { name: 'numero_nota_fiscal_remessa_saida', label: 'Número :', type: 'number' },
                            { name: 'data_nota_fiscal_remessa_saida', label: 'Data :', type: 'datetime-local' },
                            { name: 'arquivo_anexo_nota_fiscal_remessa_saida', label: 'Arquivo :', type: 'file' }
                          ]}
                          value={watchedValues.nfsaidas}
                          onChange={(value) => setValue('nfsaidas', value)}
                          isFieldRequired={isFieldRequiredWithOptions}
                          watchedValues={watchedValues}
                          grupo={grupo}
                          opcoes={opcoes}
                        />
                      </div>

                      <div className="space-y-4">
                        <AccordionFormset
                          name="nfvendas"
                          title={<span>Notas Fiscais de Venda</span>}
                          fields={[
                            { name: 'numero_nota_fiscal_venda', label: 'Número :', type: 'number' },
                            { name: 'data_nota_fiscal_venda', label: 'Data :', type: 'datetime-local' },
                            { name: 'preco_nota_fiscal_venda', label: 'Valor :', type: 'text', placeholder: 'R$ 0,00' },
                            { name: 'arquivo_anexo_nota_fiscal_venda', label: 'Arquivo :', type: 'file' }
                          ]}
                          value={watchedValues.nfvendas}
                          onChange={(value) => setValue('nfvendas', value)}
                          isFieldRequired={isFieldRequiredWithOptions}
                          watchedValues={watchedValues}
                          grupo={grupo}
                          opcoes={{
                            ...opcoes,
                            valorHandlers: {
                              onChange: (itemIndex, fieldName, inputValue, updateItem) => {
                                // Permitir apenas números
                                let raw = inputValue.replace(/\D/g, '');
                                // Atualiza valor bruto no formset
                                const number = parseInt(raw, 10) || 0;
                                updateItem(itemIndex, fieldName, number);
                              },
                              onBlur: (itemIndex, fieldName, inputValue, updateItem) => {
                                let raw = inputValue.replace(/\D/g, '');
                                const number = parseInt(raw, 10) || 0;
                                // Atualiza valor formatado no input
                                updateItem(itemIndex, fieldName, number);
                              },
                              onFocus: () => {
                                // Não faz nada especial, apenas seleciona tudo
                              }
                            },
                            valorPlaceholder: 'R$ 0,00'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </BlocoFormulario>
                </>
              )}
              
              {/* Bloco 15: Sempre visível, independente do status */}
              <BlocoFormulario title="Bloco 15: Observações e Resumo Financeiro">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <LabelObrigatorio htmlFor="observacao" obrigatorio={isFieldRequired({field: 'observacao', grupo, values: watchedValues, opcoes})}>
                      Observações :
                    </LabelObrigatorio>
                    <Textarea
                      id="observacao"
                      value={watchedValues.observacao || ''}
                      onChange={(e) => handleFieldChange('observacao', e.target.value)}
                      onBlur={() => handleFieldBlur('observacao')}
                      className={`bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 transition-colors duration-200 ${
                        fieldValidationStatus.observacao === 'invalid' 
                          ? 'border-red-500 focus:border-red-400' 
                          : fieldValidationStatus.observacao === 'valid'
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-700 focus:border-blue-400'
                      }`}
                      placeholder="Observações gerais sobre a OS"
                      rows={4}
                    />
                    {(errors.observacao || realTimeErrors.observacao) && (
                      <div className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{String(errors.observacao?.message || realTimeErrors.observacao)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h5 className="text-md font-semibold text-gray-50 mb-4">Resumo Financeiro</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white-600 text-center w-full block">
                          Soma das Notas Fiscais
                        </Label>
                        <div className="bg-slate-800 p-3 rounded border border-slate-700 text-white font-semibold">
                          {formatCurrency(watchedValues.soma_notas_fiscais)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white-600 text-center w-full block">
                          Soma Total dos Valores
                        </Label>
                        <div className="bg-slate-800 p-3 rounded border border-slate-700 text-white font-semibold">
                          {formatCurrency(watchedValues.soma_valores)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white-600 text-center w-full block">
                          Saldo Final
                        </Label>
                        <div className="bg-slate-800 p-3 rounded border border-slate-700 text-white font-semibold text-lg">
                          {formatCurrency(watchedValues.saldo_final)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </BlocoFormulario>
            </>
          )}

          <div className="bg-[#2a2b30] rounded-2xl shadow-sm border border-slate-700 p-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {/* <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewClick}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="mr-2 h-4 w-4" />
                  )}
                  Preview Valores
                </Button> */}
              </div>

              <div className="flex gap-4">
                {onCancel && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onCancel}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={loading}
                  variant="success"
                  onClick={() => {
                    handleSubmit(onSubmit)();
                  }}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {osId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Botão Voltar ao Topo */}
        <BackToTopButton />
      </div>
    </div>
  );
}

