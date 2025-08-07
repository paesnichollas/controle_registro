from rest_framework import generics, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.contrib.auth.models import User, Group
from django.db.models import Q, Count, Sum
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import cache_page, never_cache
from django.utils.decorators import method_decorator
from django.core.cache import cache
from django.db import transaction
import logging

from .models import (
    RegistroOS, DocumentoSolicitacao, DataPrevistaEntrega, AcaoSolicitacao,
    ControleQualidade, OrdemCliente, DocumentoEntrada, Levantamento, Material,
    Gmi, Gme, Rtip, Rtm, Dms, Bms, Frs, NfSaida, NfVenda,
    Cliente, TipoCQ, EspecCQ, NivelCQ, EnsaioCQ,
    AcaoSolicitacaoOption, Demanda,
    PercentualCQ, TipoMaterial,
    NomeDiligenciadorOS,
    NomeResponsavelExecucaoServico,
    ResponsavelMaterial,
    Contrato, UnidadeCliente, SetorUnidadeCliente, AprovadorCliente, SolicitanteCliente, OpcaoEspecCQ,
    RegimeOS, StatusOS, StatusOSManual, StatusOSEletronica, StatusLevantamento, StatusProducao, StatusMaterial, TipoDocumentoSolicitacao,
    StatusDMS, StatusBMS, StatusFRS,
)
from .serializers import (
    RegistroOSSerializer, RegistroOSListSerializer,
    DocumentoSolicitacaoSerializer, DataPrevistaEntregaSerializer,
    AcaoSolicitacaoSerializer, ControleQualidadeSerializer,
    OrdemClienteSerializer, DocumentoEntradaSerializer,
    LevantamentoSerializer, MaterialSerializer,
    GmiSerializer, GmeSerializer, RtipSerializer, RtmSerializer,
    DmsSerializer, BmsSerializer, FrsSerializer,
    NfSaidaSerializer, NfVendaSerializer,
    ClienteSerializer, ContratoSerializer, UnidadeClienteSerializer, SetorUnidadeClienteSerializer, AprovadorClienteSerializer, SolicitanteClienteSerializer, OpcaoEspecCQSerializer,
)
from .permissions import (
    RegistroOSPermission, IsOwnerOrReadOnly, IsAdminOrReadOnly, 
    CanDeleteRegistro, CanEditFinancialFields, SuperiorPermission
)
from .filters import RegistroOSFilter
from . import webhooks

# Configurar logger
logger = logging.getLogger(__name__)


def get_user_groups(user):
    """Retorna lista de grupos do usuário"""
    return [group.name for group in user.groups.all()]


def log_os_operation(operation, user, os_obj, details=None):
    """Log detalhado para operações de OS"""
    user_groups = get_user_groups(user)
    log_message = f"OS {operation} - ID: {os_obj.id if os_obj else 'N/A'}, " \
                  f"Usuário: {user.username}, Grupos: {user_groups}"
    
    if details:
        log_message += f", Detalhes: {details}"
    
    logger.info(log_message)


class RegistroOSViewSet(ModelViewSet):
    """ViewSet para RegistroOS com cache e logging"""
    
    permission_classes = [permissions.IsAuthenticated, RegistroOSPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RegistroOSFilter
    search_fields = [
        'numero_os', 'numero_contrato', 'descricao_resumida', 'descricao_detalhada',
        'nome_cliente__nome', 'nome_solicitante_cliente__nome', 
        'nome_responsavel_aprovacao_os_cliente__nome', 'nome_responsavel_execucao_servico__nome',
        'status_os__nome', 'observacao'
    ]
    ordering_fields = ['created_at', 'nome_cliente', 'status_os']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Queryset otimizado com select_related e prefetch_related para evitar N+1 queries"""
        queryset = (
            RegistroOS.objects
            .select_related(
                # ForeignKeys principais
                'nome_cliente',
                'numero_contrato',
                'unidade_cliente', 
                'setor_unidade_cliente',
                'status_regime_os',
                'nome_diligenciador_os',
                'nome_solicitante_cliente',
                'nome_responsavel_aprovacao_os_cliente',
                'nome_responsavel_execucao_servico',
                'id_demanda',
                'status_os',
                'status_os_manual',
                'status_os_eletronica',
                'status_levantamento',
                'status_producao',
                'usuario'
            )
            .prefetch_related(
                # ManyToMany e related sets
                'documentos_solicitacao',
                'datas_previstas',
                'acoes_solicitacao',
                'controles_qualidade',
                'ordens_cliente',
                'documentos_entrada',
                'levantamentos',
                'materiais',
                'gmis',
                'gmes',
                'rtips',
                'rtms',
                'dms',
                'bms',
                'frs',
                'notas_fiscais_saida',
                'notas_fiscais_venda'
            )
        )
        
        # Filtros de acesso baseados no usuário
        user = self.request.user
        if not user.is_authenticated:
            return RegistroOS.objects.none()
        
        # Verificar grupos do usuário
        user_groups = list(user.groups.values_list('name', flat=True))
        
        # Administradores, Superiores e Qualidade veem todas as OS
        if any(group in user_groups for group in ['Administrador', 'Superior', 'Qualidade']):
            return queryset
        
        # Outros usuários veem apenas suas próprias OS
        return queryset.filter(usuario=user)
    
    def get_serializer_class(self):
        """Retorna serializer apropriado para a ação"""
        if self.action == 'list':
            return RegistroOSListSerializer
        return RegistroOSSerializer
    
    def get_serializer_context(self):
        """Adiciona usuário ao contexto do serializer"""
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context
    
    # @method_decorator(cache_page(60), name='dispatch')
    def list(self, request, *args, **kwargs):
        """Listagem SEM cache para garantir dados atualizados"""
        return super().list(request, *args, **kwargs)
    
    # @method_decorator(cache_page(60), name='dispatch')
    def retrieve(self, request, *args, **kwargs):
        """Detalhe SEM cache para garantir dados atualizados"""
        return super().retrieve(request, *args, **kwargs)
    
    @method_decorator(never_cache, name='dispatch')
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Criação com logging detalhado"""
        user_groups = get_user_groups(request.user)
        
        logger.info(f"Iniciando criação de OS - Usuário: {request.user.username}, "
                   f"Grupos: {user_groups}")
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            response = Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
            # Log de sucesso
            os_obj = RegistroOS.objects.get(id=response.data["id"])
            log_os_operation("CRIADA", request.user, os_obj, {
                "cliente": os_obj.nome_cliente,
                "contrato": os_obj.numero_contrato,
                "objetos_relacionados": self._count_related_objects(os_obj)
            })
            
            # Limpar cache após criação
            cache.clear()
            
            # Verificar se deve disparar webhook
            if os_obj.status_os == "APROVADA":
                webhooks.webhook_os_aprovada(os_obj)
            
            return response
            
        except Exception as e:
            logger.error(f"Erro na criação de OS - Usuário: {request.user.username}, "
                        f"Erro: {str(e)}")
            raise
    
    def perform_create(self, serializer):
        """Define o usuário na criação da OS"""
        serializer.save(usuario=self.request.user)
    
    @method_decorator(never_cache, name='dispatch')
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Atualização com logging detalhado"""
        instance = self.get_object()
        old_status = instance.status_os
        
        user_groups = get_user_groups(request.user)
        
        logger.info(f"Iniciando atualização de OS {instance.id} - "
                   f"Usuário: {request.user.username}, Grupos: {user_groups}")
        
        try:
            response = super().update(request, *args, **kwargs)
            
            # Recarregar instância
            instance.refresh_from_db()
            
            # Log de sucesso
            log_os_operation('ATUALIZADA', request.user, instance, {
                'status_anterior': old_status,
                'status_atual': instance.status_os,
                'campos_alterados': list(request.data.keys())
            })
            
            # Limpar cache após atualização
            cache.clear()
            
            # Verificar webhooks
            if old_status != 'APROVADA' and instance.status_os == 'APROVADA':
                webhooks.webhook_os_aprovada(instance)
            
            # Verificar materiais aprovados
            if 'materiais' in request.data:
                self._check_material_webhooks(instance, request.data['materiais'])
            
            return response
            
        except Exception as e:
            logger.error(f"Erro na atualização de OS {instance.id} - "
                        f"Usuário: {request.user.username}, Erro: {str(e)}")
            raise
    
    @method_decorator(never_cache, name='dispatch')
    def destroy(self, request, *args, **kwargs):
        """Exclusão com logging"""
        instance = self.get_object()
        
        # Verificar permissão de exclusão
        if not request.user.groups.filter(name='Administrador').exists():
            logger.warning(f"Tentativa de exclusão negada - OS {instance.id}, "
                          f"Usuário: {request.user.username}")
            return Response(
                {'detail': 'Apenas administradores podem excluir OS.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        log_os_operation('EXCLUÍDA', request.user, instance, {
            'cliente': instance.nome_cliente,
            'contrato': instance.numero_contrato
        })
        
        # Limpar cache após exclusão
        cache.clear()
        
        return super().destroy(request, *args, **kwargs)
    
    def _count_related_objects(self, os_obj):
        """Conta objetos relacionados para logging"""
        return {
            'documentos_solicitacao': os_obj.documentos_solicitacao.count(),
            'materiais': os_obj.materiais.count(),
            'levantamentos': os_obj.levantamentos.count(),
            'controles_qualidade': os_obj.controles_qualidade.count(),
        }
    
    def _check_material_webhooks(self, os_obj, materiais_data):
        """Verifica se algum material foi entregue para disparar webhook"""
        for material_data in materiais_data:
            if material_data.get('status_material') == 'ENTREGUE':
                if 'id' in material_data:
                    try:
                        material = Material.objects.get(id=material_data['id'])
                        webhooks.webhook_material_aprovado(material)
                    except Material.DoesNotExist:
                        pass
    
    @action(detail=True, methods=['post'])
    def recalcular(self, request, pk=None):
        """Recalcula valores da OS"""
        os_obj = self.get_object()
        
        logger.info(f"Recálculo solicitado para OS {os_obj.id} - "
                   f"Usuário: {request.user.username}")
        
        os_obj.calcular_soma_valores()
        os_obj.calcular_saldo_final()
        os_obj.save()
        
        return Response({
            'message': 'Valores recalculados com sucesso',
            'soma_valores': os_obj.soma_valores,
            'saldo_final': os_obj.saldo_final
        })


class RegistroOSDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View detalhada para RegistroOS"""
    
    queryset = RegistroOS.objects.all()
    serializer_class = RegistroOSSerializer
    permission_classes = [permissions.IsAuthenticated, RegistroOSPermission]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context


# Views para objetos relacionados
class DocumentoSolicitacaoViewSet(ModelViewSet):
    serializer_class = DocumentoSolicitacaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        return DocumentoSolicitacao.objects.filter(
            registro_id=self.kwargs['registro_pk']
        )
    
    def perform_create(self, serializer):
        registro = get_object_or_404(RegistroOS, pk=self.kwargs['registro_pk'])
        serializer.save(registro=registro)


class MaterialViewSet(ModelViewSet):
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        return Material.objects.filter(
            registro_id=self.kwargs['registro_pk']
        )
    
    def perform_create(self, serializer):
        registro = get_object_or_404(RegistroOS, pk=self.kwargs['registro_pk'])
        serializer.save(registro=registro)


class LevantamentoViewSet(ModelViewSet):
    serializer_class = LevantamentoSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        return Levantamento.objects.filter(
            registro_id=self.kwargs['registro_pk']
        )
    
    def perform_create(self, serializer):
        registro = get_object_or_404(RegistroOS, pk=self.kwargs['registro_pk'])
        serializer.save(registro=registro)


# Views utilitárias
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def opcoes_view(request):
    """Retorna opções para formulários populadas do banco de dados"""
    logger.info(f"Opções solicitadas por {request.user.username}")
    
    try:
        # Verificar se foi passado um parâmetro de cliente
        cliente_nome = request.GET.get('cliente')
        
        opcoes = {
            # Clientes - do banco de dados
            'clientes': list(Cliente.objects.values_list('nome', flat=True)),
            
            # Status da OS - dos novos modelos relacionais
            'status_os': [{'id': s.id, 'nome': s.nome} for s in StatusOS.objects.all()],
            'status_os_manual': [{'id': s.id, 'nome': s.nome} for s in StatusOSManual.objects.all()],
            'status_os_eletronica': [{'id': s.id, 'nome': s.nome} for s in StatusOSEletronica.objects.all()],
            'status_levantamento': [{'id': s.id, 'nome': s.nome} for s in StatusLevantamento.objects.all()],
            'status_producao': [{'id': s.id, 'nome': s.nome} for s in StatusProducao.objects.all()],
            
            # Regime da OS
            'regimes_os': list(RegimeOS.objects.values_list('nome', flat=True)),
            
            # Opções de valor (Sim/Não)
            'opcoes_valor': [choice[0] for choice in RegistroOS.OPCOES_VALOR if choice[0]],
            'opcoes_orcamento': [choice[0] for choice in RegistroOS.OPCOES_ORCAMENTO if choice[0]],
            'opcoes_dms': [choice[0] for choice in RegistroOS.OPCOES_DMS if choice[0]],
            'opcoes_bms': [choice[0] for choice in RegistroOS.OPCOES_BMS if choice[0]],
            'opcoes_frs': [choice[0] for choice in RegistroOS.OPCOES_FRS if choice[0]],
            'opcoes_notas_fiscais': [choice[0] for choice in RegistroOS.OPCOES_NOTAS_FISCAIS if choice[0]],
            
            # Tipos de documento - do novo modelo relacional
            'tipos_documento': [{'id': t.id, 'nome': t.nome} for t in TipoDocumentoSolicitacao.objects.all()],
            
            # Tipos de material - dos novos modelos relacionais
            'tipos_material': list(TipoMaterial.objects.values_list('nome', flat=True)),
            'status_material': list(StatusMaterial.objects.values_list('nome', flat=True)),
            'responsaveis_material': list(ResponsavelMaterial.objects.values_list('nome', flat=True)),
            
            # Status de documentos - dos novos modelos relacionais
            'status_dms': [{'id': s.id, 'nome': s.status} for s in StatusDMS.objects.all()],
            'status_bms': [{'id': s.id, 'nome': s.status} for s in StatusBMS.objects.all()],
            'status_frs': [{'id': s.id, 'nome': s.status} for s in StatusFRS.objects.all()],
            
            # Ações de solicitação - do novo modelo relacional
            'acoes_solicitacao': list(AcaoSolicitacaoOption.objects.values_list('descricao', flat=True)),
            
            # Controle de qualidade - dos novos modelos relacionais
            'tipos_cq': list(TipoCQ.objects.values_list('nome', flat=True)),
            'niveis_inspecao_cq': list(NivelCQ.objects.values_list('nome', flat=True)),
            'tipos_ensaio_cq': list(EnsaioCQ.objects.values_list('nome', flat=True)),
            'percentuais_cq': list(PercentualCQ.objects.values_list('percentual', flat=True)),
            
            # Dados do banco de dados
            'diligenciadores': list(NomeDiligenciadorOS.objects.values_list('nome', flat=True)),
            # Remover referências aos modelos removidos
            'responsaveis_servico': list(NomeResponsavelExecucaoServico.objects.values_list('nome', flat=True)),
            'demandas': list(Demanda.objects.values_list('nome', flat=True)),
            'tipos_cq_db': list(TipoCQ.objects.values_list('nome', flat=True)),
            'niveis_cq_db': list(NivelCQ.objects.values_list('nome', flat=True)),
            'ensaios_cq_db': list(EnsaioCQ.objects.values_list('nome', flat=True)),
            'especs_cq_db': list(EspecCQ.objects.values_list('nome', flat=True)),
            'percentuais_cq_db': list(PercentualCQ.objects.values_list('percentual', flat=True)),
            'tipos_material_db': list(TipoMaterial.objects.values_list('nome', flat=True)),
            'status_dms_db': [{'id': s.id, 'nome': s.status} for s in StatusDMS.objects.all()],
            'status_bms_db': [{'id': s.id, 'nome': s.status} for s in StatusBMS.objects.all()],
            'status_frs_db': [{'id': s.id, 'nome': s.status} for s in StatusFRS.objects.all()],
            'acoes_solicitacao_db': list(AcaoSolicitacaoOption.objects.values_list('descricao', flat=True)),
            'responsaveis_material_db': list(ResponsavelMaterial.objects.values_list('nome', flat=True)),
        }
        
        # Se foi especificado um cliente, adicionar as opções dependentes
        if cliente_nome:
            try:
                cliente = Cliente.objects.get(nome=cliente_nome)
                
                # Buscar dados dos novos modelos relacionais
                contratos = Contrato.objects.filter(cliente=cliente, ativo=True)
                unidades = UnidadeCliente.objects.filter(cliente=cliente, ativo=True)
                aprovadores = AprovadorCliente.objects.filter(cliente=cliente, ativo=True)
                solicitantes = SolicitanteCliente.objects.filter(cliente=cliente, ativo=True)
                opcoes_espec_cq = OpcaoEspecCQ.objects.filter(cliente=cliente, ativo=True)
                
                # Buscar setores da primeira unidade (mantendo compatibilidade)
                setores = []
                primeira_unidade = unidades.first()
                if primeira_unidade:
                    setores = SetorUnidadeCliente.objects.filter(unidade=primeira_unidade, ativo=True)
                
                opcoes.update({
                    'contratos_cliente': [c.numero for c in contratos],
                    'unidades_cliente': [u.nome for u in unidades],
                    'setores_cliente': [s.nome for s in setores],
                    'opcoes_espec_cq_cliente': [o.nome for o in opcoes_espec_cq],
                    'aprovadores_cliente': [a.nome for a in aprovadores],
                    'solicitantes_cliente': [s.nome for s in solicitantes],
                })
                logger.info(f"Opções do cliente '{cliente_nome}' incluídas na resposta")
            except Cliente.DoesNotExist:
                logger.warning(f"Cliente '{cliente_nome}' não encontrado para opções dependentes")
        
        logger.info(f"Opções carregadas com sucesso para {request.user.username}")
        return Response(opcoes)
        
    except Exception as e:
        logger.error(f"Erro ao carregar opções: {str(e)}")
        return Response(
            {'error': 'Erro ao carregar opções do banco de dados'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def perfil_view(request):
    """Retorna perfil do usuário"""
    user = request.user
    grupos = [group.name for group in user.groups.all()]
    
    logger.info(f"Perfil solicitado por {user.username}")
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'groups': grupos,
        'is_admin': user.groups.filter(name='Administrador').exists()
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def estatisticas_view(request):
    """Retorna estatísticas detalhadas do sistema para o dashboard"""
    user = request.user
    
    logger.info(f"Estatísticas detalhadas solicitadas por {user.username}")
    
    try:
        # Filtrar OS baseado nas permissões
        user_groups = list(user.groups.values_list('name', flat=True))
        
        # Administradores, Superiores e Qualidade veem todas as OS
        if any(group in user_groups for group in ['Administrador', 'Superior', 'Qualidade']):
            queryset = RegistroOS.objects.all()
        else:
            queryset = RegistroOS.objects.filter(usuario=user)
        
        # Estatísticas básicas
        total_os = queryset.count()
        os_por_status = dict(
            queryset.values_list('status_os__nome').annotate(
                count=Count('id')
            )
        )
        
        # Atividades recentes (últimas 10 OS criadas)
        atividades_recentes = queryset.order_by('-created_at')[:10].values(
            'id', 'numero_os', 'nome_cliente__nome', 'status_os__nome', 
            'created_at', 'descricao_resumida'
        )
        
        # Dados para gráfico de OS por mês (últimos 12 meses) - Versão simplificada
        from django.utils import timezone
        from datetime import timedelta
        
        # Calcular data de 12 meses atrás
        data_inicio = timezone.now() - timedelta(days=365)
        
        # Versão simplificada sem .extra()
        os_por_mes = queryset.filter(
            created_at__gte=data_inicio
        ).values('created_at').annotate(
            total=Count('id')
        ).order_by('created_at')
        
        # Dados para gráfico de valores por mês - Versão simplificada
        valores_por_mes = queryset.filter(
            created_at__gte=data_inicio,
            soma_valores__gt=0
        ).values('created_at').annotate(
            valor_total=Sum('soma_valores')
        ).order_by('created_at')
        
        # Formatar dados para os gráficos
        meses_nomes = {
            1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
            7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'
        }
        
        # Preparar dados do gráfico de OS por mês - Versão simplificada
        dados_os_por_mes = []
        for item in os_por_mes:
            data = item['created_at']
            mes = data.month
            ano = data.year
            dados_os_por_mes.append({
                'mes': f"{meses_nomes[mes]} {ano}",
                'os': item['total']
            })
        
        # Preparar dados do gráfico de valores por mês - Versão simplificada
        dados_valores_por_mes = []
        for item in valores_por_mes:
            data = item['created_at']
            mes = data.month
            ano = data.year
            dados_valores_por_mes.append({
                'mes': f"{meses_nomes[mes]} {ano}",
                'valor': float(item['valor_total']) if item['valor_total'] else 0
            })
        
        # Formatar atividades recentes
        atividades_formatadas = []
        for atividade in atividades_recentes:
            # Calcular tempo decorrido
            tempo_decorrido = timezone.now() - atividade['created_at']
            if tempo_decorrido.days > 0:
                tempo_texto = f"há {tempo_decorrido.days} dia{'s' if tempo_decorrido.days > 1 else ''}"
            elif tempo_decorrido.seconds > 3600:
                horas = tempo_decorrido.seconds // 3600
                tempo_texto = f"há {horas} hora{'s' if horas > 1 else ''}"
            else:
                minutos = tempo_decorrido.seconds // 60
                tempo_texto = f"há {minutos} minuto{'s' if minutos > 1 else ''}"
            
            atividades_formatadas.append({
                'id': atividade['id'],
                'numero_os': atividade['numero_os'],
                'cliente': atividade['nome_cliente__nome'] or 'Cliente não informado',
                'status': atividade['status_os__nome'] or 'Status não informado',
                'tempo_decorrido': tempo_texto,
                'descricao': atividade['descricao_resumida'] or 'Sem descrição'
            })
        
        # Contadores por status com lógica flexível
        from django.db.models import Q
        
        # Status que indicam "concluída" (considerando variações)
        status_concluida = [
            'CONCLUIDO', 'CONCLUÍDO', 'CONCLUIDA', 'CONCLUÍDA',
            'FINALIZADO', 'FINALIZADA', 'FINALIZADO', 'FINALIZADA',
            'concluido', 'concluído', 'concluida', 'concluída',
            'finalizado', 'finalizada', 'finalizado', 'finalizada'
        ]
        
        # Status que indicam "em andamento" (considerando variações)
        status_em_andamento = [
            'APROVADA', 'APROVADO', 'APROVADA', 'APROVADO', 'Aprovada', 'Aprovado',
            'EM ANDAMENTO', 'EM_ANDAMENTO', 'EMANDAMENTO', 'Em Andamento',
            'aprovada', 'aprovado', 'aprovada', 'aprovado',
            'em andamento', 'em_andamento', 'emandamento'
        ]
        
        # Status que indicam "cancelada" (considerando variações)
        status_cancelada = [
            'CANCELADA', 'CANCELADO', 'Cancelada', 'Cancelado',
            'cancelada', 'cancelado'
        ]
        
        # OS Abertas: todas exceto as concluídas, em andamento e canceladas
        os_abertas = queryset.exclude(
            status_os__nome__in=status_concluida + status_em_andamento + status_cancelada
        ).count()
        
        # OS Em Andamento: status aprovada ou em andamento
        os_em_andamento = queryset.filter(
            status_os__nome__in=status_em_andamento
        ).count()
        
        # OS Concluídas: status concluída ou finalizada
        os_concluidas = queryset.filter(
            status_os__nome__in=status_concluida
        ).count()
        
        # OS Canceladas: status cancelada
        os_canceladas = queryset.filter(
            status_os__nome__in=status_cancelada
        ).count()
        
        stats = {
            'total_os': total_os,
            'os_abertas': os_abertas,
            'os_em_andamento': os_em_andamento,
            'os_concluidas': os_concluidas,
            'os_canceladas': os_canceladas,
            'os_por_status': os_por_status,
            'atividades_recentes': atividades_formatadas,
            'grafico_os_por_mes': dados_os_por_mes,
            'grafico_valores_por_mes': dados_valores_por_mes,
            'total_materiais': Material.objects.filter(
                registro__in=queryset
            ).count(),
        }
        
        logger.info(f"Estatísticas geradas com sucesso para {user.username}")
        return Response(stats)
        
    except Exception as e:
        logger.error(f"Erro ao gerar estatísticas para {user.username}: {str(e)}")
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST', 'GET'])
@permission_classes([permissions.IsAuthenticated])
def webhook_test_view(request):
    """Endpoint para testar webhooks manualmente - Simplificado"""
    
    if request.method == 'GET':
        # Retorna informações sobre webhooks disponíveis
        webhook_info = {
            'webhooks_disponiveis': [
                'os_aprovada',
                'material_aprovado', 
                'os_concluida',
                'os_cancelada',
                'material_rejeitado'
            ],
            'configuracao': webhooks.validar_webhook_config(),
            'historico': webhooks.get_webhook_history(),
            'exemplo_payload': {
                'tipo': 'os_aprovada',
                'os_id': 1,
                'dados_teste': {
                    'cliente': 'BRASKEM',
                    'contrato': 'TEST-001'
                }
            }
        }
        
        logger.info(f"Informações de webhook solicitadas por {request.user.username}")
        return Response(webhook_info)
    
    elif request.method == 'POST':
        # Dispara webhook de teste usando função do módulo webhooks
        tipo = request.data.get('tipo')
        dados_teste = request.data.get('dados_teste', {})
        
        logger.info(f"Teste de webhook solicitado por {request.user.username} - Tipo: {tipo}")
        
        try:
            # Usar função genérica do módulo webhooks
            webhook_data = webhooks.webhook_teste(tipo, dados_teste)
            
            return Response({
                'message': f'Webhook {tipo} disparado com sucesso',
                'webhook_data': webhook_data,
                'timestamp': webhook_data.get('timestamp')
            })
            
        except Exception as e:
            logger.error(f"Erro ao disparar webhook de teste - "
                        f"Usuário: {request.user.username}, Erro: {str(e)}")
            return Response(
                {'error': f'Erro interno: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def test_file_upload_view(request):
    """Endpoint para testar upload de arquivos de forma isolada"""
    try:
        # Log dos dados recebidos
        logger.info(f"Teste de upload - Dados recebidos: {dict(request.data)}")
        logger.info(f"Teste de upload - Arquivos recebidos: {dict(request.FILES)}")
        
        # Verificar se há arquivos
        if not request.FILES:
            return Response({
                'error': 'Nenhum arquivo foi submetido',
                'files_received': list(request.FILES.keys()),
                'data_received': list(request.data.keys())
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Processar cada arquivo
        uploaded_files = []
        for field_name, uploaded_file in request.FILES.items():
            file_info = {
                'field_name': field_name,
                'file_name': uploaded_file.name,
                'file_size': uploaded_file.size,
                'content_type': uploaded_file.content_type
            }
            uploaded_files.append(file_info)
            
            # Log detalhado do arquivo
            logger.info(f"Arquivo processado: {file_info}")
        
        return Response({
            'success': True,
            'message': f'{len(uploaded_files)} arquivo(s) recebido(s) com sucesso',
            'uploaded_files': uploaded_files,
            'total_files': len(uploaded_files)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erro no teste de upload: {e}")
        return Response({
            'error': str(e),
            'type': 'upload_test_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Endpoint para preencher automaticamente dados do cliente
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dados_cliente_view(request, cliente_nome):
    """Retorna todos os dados dinâmicos do cliente no formato esperado pelo frontend (com id e nome)"""
    try:
        cliente = Cliente.objects.get(nome__iexact=cliente_nome)
        
        # Converter valores HH de forma segura
        def safe_float(value, default=0.0):
            try:
                if value is None:
                    return default
                return float(value)
            except (ValueError, TypeError):
                return default
        
        # Buscar dados dos novos modelos relacionais
        contratos = Contrato.objects.filter(cliente=cliente, ativo=True)
        unidades = UnidadeCliente.objects.filter(cliente=cliente, ativo=True)
        aprovadores = AprovadorCliente.objects.filter(cliente=cliente, ativo=True)
        solicitantes = SolicitanteCliente.objects.filter(cliente=cliente, ativo=True)
        opcoes_espec_cq = OpcaoEspecCQ.objects.filter(cliente=cliente, ativo=True)
        
        # Buscar setores da primeira unidade (mantendo compatibilidade)
        setores = []
        primeira_unidade = unidades.first()
        if primeira_unidade:
            setores = SetorUnidadeCliente.objects.filter(unidade=primeira_unidade, ativo=True)
        
        return Response({
            # Para selects (objetos com id e nome) - usando novos modelos
            'contratos': [{"id": c.id, "nome": c.numero} for c in contratos],
            'unidades': [{"id": u.id, "nome": u.nome} for u in unidades],
            'setores': [{"id": s.id, "nome": s.nome} for s in setores],
            'opcoes_espec_cq': [{"id": o.id, "nome": o.nome} for o in opcoes_espec_cq],
            'aprovadores': [{"id": a.id, "nome": a.nome} for a in aprovadores],
            'solicitantes': [{"id": s.id, "nome": s.nome} for s in solicitantes],
            
            # Para campos dependentes (strings para popular automaticamente)
            'dados_dependentes': {
                'numero_contrato': contratos.first().numero if contratos.exists() else '',
                'unidade_cliente': unidades.first().nome if unidades.exists() else '',
                'setor_unidade_cliente': setores.first().nome if setores.exists() else '',
                'aprovador_cliente': aprovadores.first().nome if aprovadores.exists() else '',
                'solicitante_cliente': solicitantes.first().nome if solicitantes.exists() else '',
                'opcoes_espec_cq': opcoes_espec_cq.first().nome if opcoes_espec_cq.exists() else '',
            },
            
            # HH do cliente
            'hh_clientes': {
                'valor_fabricacao': safe_float(cliente.hh_valor_fabricacao),
                'valor_levantamento': safe_float(cliente.hh_valor_levantamento),
                'valor_servico_pintura_revestimento': safe_float(cliente.hh_valor_servico_pintura_revestimento),
                'valor_montagem': safe_float(cliente.hh_valor_montagem),
                'valor_inspecao': safe_float(cliente.hh_valor_inspecao),
            }
        })
    except Cliente.DoesNotExist:
        return Response({}, status=404)
    except Exception as e:
        logger.error(f"Erro ao carregar dados do cliente '{cliente_nome}': {str(e)}")
        return Response(
            {'error': 'Erro interno do servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Endpoint para calcular soma dos valores e saldo final (preview)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_valores_view(request):
    """Endpoint para calcular preview dos valores baseado nos campos 'havera_valor'"""
    try:
        data = request.data
        total = 0

        # Campos de valor e seus respectivos campos "havera" (consistente com o modelo)
        campos = [
            ('havera_valor_fabricacao', 'valor_fabricacao'),
            ('havera_valor_levantamento', 'valor_levantamento'),
            ('havera_valor_material_fabricacao', 'valor_material_fabricacao'),
            ('havera_valor_material_pintura', 'valor_material_pintura'),
            ('havera_valor_servico_pintura_revestimento', 'valor_servico_pintura_revestimento'),
            ('havera_valor_montagem', 'valor_montagem'),
            ('havera_valor_material_montagem', 'valor_material_montagem'),
            ('havera_valor_inspecao', 'valor_inspecao'),
            ('havera_valor_hh', 'valor_hh'),  # Campo incluído para consistência
            ('havera_valor_manutencao_valvula', 'valor_manutencao_valvula'),
            ('havera_valor_servico_terceiros', 'valor_servico_terceiros'),
        ]

        # Soma apenas os valores dos campos que têm "havera_valor" = "SIM"
        for flag, campo in campos:
            if data.get(flag) == 'SIM':
                valor = data.get(campo, 0)
                # Garantir que o valor seja numérico
                try:
                    total += float(valor) if valor else 0
                except (ValueError, TypeError):
                    total += 0

        # Soma das notas fiscais
        soma_nf = 0
        try:
            soma_nf = float(data.get('soma_notas_fiscais') or 0)
        except (ValueError, TypeError):
            soma_nf = 0

        saldo = total - soma_nf

        return Response({
            'soma_valores': total,
            'soma_notas_fiscais': soma_nf,
            'saldo_final': saldo
        })
    except Exception as e:
        logger.error(f"Erro no preview de valores: {str(e)}")
        return Response({
            'error': 'Erro ao calcular valores',
            'soma_valores': 0,
            'soma_notas_fiscais': 0,
            'saldo_final': 0
        }, status=500)


# ViewSet para Cliente
from .serializers import ClienteSerializer
from .models import Cliente

class ClienteViewSet(ModelViewSet):
    """ViewSet para gerenciar clientes"""
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Definir permissões baseadas na ação"""
        if self.action in ['create', 'update', 'partial_update']:
            # Administradores e Superiores podem criar/editar clientes
            permission_classes = [IsAuthenticated, SuperiorPermission]
        elif self.action == 'destroy':
            # Apenas administradores podem excluir clientes
            permission_classes = [IsAuthenticated, CanDeleteRegistro]
        else:
            # Todos usuários autenticados podem listar/visualizar
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """Log de criação de cliente"""
        cliente = serializer.save()
        logger.info(f"Cliente criado - Nome: {cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de cliente"""
        cliente = serializer.save()
        logger.info(f"Cliente atualizado - Nome: {cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Log de exclusão de cliente"""
        logger.info(f"Cliente excluído - Nome: {instance.nome}, "
                   f"Usuário: {self.request.user.username}")
        super().perform_destroy(instance)


# ViewSets para os novos modelos relacionais
class ContratoViewSet(ModelViewSet):
    """ViewSet para gerenciar contratos"""
    queryset = Contrato.objects.filter(ativo=True)
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated, SuperiorPermission]
    
    def get_queryset(self):
        """Filtrar por cliente se especificado"""
        queryset = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente_id', None)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset
    
    def perform_create(self, serializer):
        """Log de criação de contrato"""
        contrato = serializer.save()
        logger.info(f"Contrato criado - Número: {contrato.numero}, Cliente: {contrato.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de contrato"""
        contrato = serializer.save()
        logger.info(f"Contrato atualizado - Número: {contrato.numero}, Cliente: {contrato.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete - marca como inativo"""
        instance.ativo = False
        instance.save()
        logger.info(f"Contrato desativado - Número: {instance.numero}, Cliente: {instance.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")


class UnidadeClienteViewSet(ModelViewSet):
    """ViewSet para gerenciar unidades do cliente"""
    queryset = UnidadeCliente.objects.filter(ativo=True)
    serializer_class = UnidadeClienteSerializer
    permission_classes = [IsAuthenticated, SuperiorPermission]
    
    def get_queryset(self):
        """Filtrar por cliente se especificado"""
        queryset = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente_id', None)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset
    
    def perform_create(self, serializer):
        """Log de criação de unidade"""
        unidade = serializer.save()
        logger.info(f"Unidade criada - Nome: {unidade.nome}, Cliente: {unidade.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de unidade"""
        unidade = serializer.save()
        logger.info(f"Unidade atualizada - Nome: {unidade.nome}, Cliente: {unidade.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete - marca como inativo"""
        instance.ativo = False
        instance.save()
        logger.info(f"Unidade desativada - Nome: {instance.nome}, Cliente: {instance.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")


class SetorUnidadeClienteViewSet(ModelViewSet):
    """ViewSet para gerenciar setores das unidades"""
    queryset = SetorUnidadeCliente.objects.filter(ativo=True)
    serializer_class = SetorUnidadeClienteSerializer
    permission_classes = [IsAuthenticated, SuperiorPermission]
    
    def get_queryset(self):
        """Filtrar por unidade ou cliente se especificado"""
        queryset = super().get_queryset()
        unidade_id = self.request.query_params.get('unidade_id', None)
        cliente_id = self.request.query_params.get('cliente_id', None)
        
        if unidade_id:
            queryset = queryset.filter(unidade_id=unidade_id)
        elif cliente_id:
            queryset = queryset.filter(unidade__cliente_id=cliente_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Log de criação de setor"""
        setor = serializer.save()
        logger.info(f"Setor criado - Nome: {setor.nome}, Unidade: {setor.unidade.nome}, "
                   f"Cliente: {setor.unidade.cliente.nome}, Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de setor"""
        setor = serializer.save()
        logger.info(f"Setor atualizado - Nome: {setor.nome}, Unidade: {setor.unidade.nome}, "
                   f"Cliente: {setor.unidade.cliente.nome}, Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete - marca como inativo"""
        instance.ativo = False
        instance.save()
        logger.info(f"Setor desativado - Nome: {instance.nome}, Unidade: {instance.unidade.nome}, "
                   f"Cliente: {instance.unidade.cliente.nome}, Usuário: {self.request.user.username}")


class AprovadorClienteViewSet(ModelViewSet):
    """ViewSet para gerenciar aprovadores do cliente"""
    queryset = AprovadorCliente.objects.filter(ativo=True)
    serializer_class = AprovadorClienteSerializer
    permission_classes = [IsAuthenticated, SuperiorPermission]
    
    def get_queryset(self):
        """Filtrar por cliente se especificado"""
        queryset = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente_id', None)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset
    
    def perform_create(self, serializer):
        """Log de criação de aprovador"""
        aprovador = serializer.save()
        logger.info(f"Aprovador criado - Nome: {aprovador.nome}, Cliente: {aprovador.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de aprovador"""
        aprovador = serializer.save()
        logger.info(f"Aprovador atualizado - Nome: {aprovador.nome}, Cliente: {aprovador.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete - marca como inativo"""
        instance.ativo = False
        instance.save()
        logger.info(f"Aprovador desativado - Nome: {instance.nome}, Cliente: {instance.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")


class SolicitanteClienteViewSet(ModelViewSet):
    """ViewSet para gerenciar solicitantes do cliente"""
    queryset = SolicitanteCliente.objects.filter(ativo=True)
    serializer_class = SolicitanteClienteSerializer
    permission_classes = [IsAuthenticated, SuperiorPermission]
    
    def get_queryset(self):
        """Filtrar por cliente se especificado"""
        queryset = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente_id', None)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset
    
    def perform_create(self, serializer):
        """Log de criação de solicitante"""
        solicitante = serializer.save()
        logger.info(f"Solicitante criado - Nome: {solicitante.nome}, Cliente: {solicitante.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de solicitante"""
        solicitante = serializer.save()
        logger.info(f"Solicitante atualizado - Nome: {solicitante.nome}, Cliente: {solicitante.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete - marca como inativo"""
        instance.ativo = False
        instance.save()
        logger.info(f"Solicitante desativado - Nome: {instance.nome}, Cliente: {instance.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")


class OpcaoEspecCQViewSet(ModelViewSet):
    """ViewSet para gerenciar opções específicas de CQ"""
    queryset = OpcaoEspecCQ.objects.filter(ativo=True)
    serializer_class = OpcaoEspecCQSerializer
    permission_classes = [IsAuthenticated, SuperiorPermission]
    
    def get_queryset(self):
        """Filtrar por cliente se especificado"""
        queryset = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente_id', None)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset
    
    def perform_create(self, serializer):
        """Log de criação de opção específica"""
        opcao = serializer.save()
        logger.info(f"Opção específica criada - Nome: {opcao.nome}, Cliente: {opcao.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """Log de atualização de opção específica"""
        opcao = serializer.save()
        logger.info(f"Opção específica atualizada - Nome: {opcao.nome}, Cliente: {opcao.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")
    
    def perform_destroy(self, instance):
        """Soft delete - marca como inativo"""
        instance.ativo = False
        instance.save()
        logger.info(f"Opção específica desativada - Nome: {instance.nome}, Cliente: {instance.cliente.nome}, "
                   f"Usuário: {self.request.user.username}")


# Endpoints removidos - funcionalidade consolidada em dados_cliente_view
# e endpoints simplificados acima


# Endpoints simplificados para dados dinâmicos
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tipos_cq_view(request):
    """Retorna tipos de CQ"""
    tipos = TipoCQ.objects.all()
    return Response([{'id': t.id, 'nome': t.nome} for t in tipos])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def niveis_cq_view(request):
    """Retorna níveis de CQ"""
    niveis = NivelCQ.objects.all()
    return Response([{'id': n.id, 'nome': n.nome} for n in niveis])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ensaios_cq_view(request):
    """Retorna ensaios de CQ"""
    ensaios = EnsaioCQ.objects.all()
    return Response([{'id': e.id, 'nome': e.nome} for e in ensaios])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def acoes_solicitacao_view(request):
    """Retorna ações de solicitação"""
    acoes = AcaoSolicitacaoOption.objects.all()
    return Response([{'id': a.id, 'nome': a.descricao} for a in acoes])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def demandas_view(request):
    """Retorna demandas"""
    demandas = Demanda.objects.all()
    return Response([{'id': d.id, 'nome': d.nome} for d in demandas])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def percentuais_cq_view(request):
    """Retorna percentuais de CQ"""
    percentuais = PercentualCQ.objects.all()
    return Response([{'id': p.id, 'nome': p.percentual} for p in percentuais])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tipos_material_view(request):
    """Retorna tipos de material"""
    tipos = TipoMaterial.objects.all()
    return Response([{'id': t.id, 'nome': t.nome} for t in tipos])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_dms_view(request):
    """Retorna status DMS"""
    status_options = StatusDMS.objects.all()
    return Response([{'id': s.id, 'nome': s.status} for s in status_options])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_bms_view(request):
    """Retorna status BMS"""
    status_options = StatusBMS.objects.all()
    return Response([{'id': s.id, 'nome': s.status} for s in status_options])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_frs_view(request):
    """Retorna status FRS"""
    status_options = StatusFRS.objects.all()
    return Response([{'id': s.id, 'nome': s.status} for s in status_options])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def diligenciadores_view(request):
    """Retorna diligenciadores"""
    diligenciadores = NomeDiligenciadorOS.objects.all()
    return Response([{'id': d.id, 'nome': d.nome} for d in diligenciadores])

# Remover as views solicitantes_view e aprovadores_view que não existem mais

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def executores_view(request):
    """Retorna executores"""
    executores = NomeResponsavelExecucaoServico.objects.all()
    return Response([{'id': e.id, 'nome': e.nome} for e in executores])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def responsaveis_material_view(request):
    """Retorna responsáveis por material"""
    responsaveis = ResponsavelMaterial.objects.all()
    return Response([{'id': r.id, 'nome': r.nome} for r in responsaveis])


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def clientes_nomes_view(request):
    """Retorna apenas nomes dos clientes para selects"""
    clientes = Cliente.objects.all()
    return Response([{'id': c.id, 'nome': c.nome} for c in clientes])

# Novos endpoints para modelos relacionais
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_os_view(request):
    """Retorna status OS"""
    status = StatusOS.objects.all()
    return Response([{'id': s.id, 'nome': s.nome} for s in status])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_os_manual_view(request):
    """Retorna status OS manual"""
    status = StatusOSManual.objects.all()
    return Response([{'id': s.id, 'nome': s.nome} for s in status])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_os_eletronica_view(request):
    """Retorna status OS eletrônica"""
    status = StatusOSEletronica.objects.all()
    return Response([{'id': s.id, 'nome': s.nome} for s in status])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_levantamento_view(request):
    """Retorna status levantamento"""
    status = StatusLevantamento.objects.all()
    return Response([{'id': s.id, 'nome': s.nome} for s in status])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_producao_view(request):
    """Retorna status produção"""
    status = StatusProducao.objects.all()
    return Response([{'id': s.id, 'nome': s.nome} for s in status])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def regimes_os_view(request):
    """Retorna regimes OS"""
    regimes = RegimeOS.objects.all()
    return Response([{'id': r.id, 'nome': r.nome} for r in regimes])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def status_material_view(request):
    """Retorna status material"""
    status = StatusMaterial.objects.all()
    return Response([{'id': s.id, 'nome': s.nome} for s in status])

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tipos_documento_solicitacao_view(request):
    """Retorna todos os tipos de documento de solicitação"""
    tipos = TipoDocumentoSolicitacao.objects.all().order_by('nome')
    return Response([{'id': t.id, 'nome': t.nome} for t in tipos])


# Views para gerenciamento de selects
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def gerenciar_selects_view(request):
    """Retorna dados para gerenciamento de selects"""
    user_groups = [group.name for group in request.user.groups.all()]
    if not any(group in user_groups for group in ['Administrador', 'Superior']):
        return Response({
            'error': 'Acesso negado. Apenas administradores e superiores podem acessar esta funcionalidade.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Dados dos modelos para gerenciar
    dados = {
        'AcaoSolicitacaoOption': {
            'titulo': 'Ações de Solicitação',
            'campo': 'descricao',
            'total': AcaoSolicitacaoOption.objects.count(),
            'itens': [{'id': item.id, 'nome': item.descricao} for item in AcaoSolicitacaoOption.objects.all()]
        },
        'Demanda': {
            'titulo': 'Demandas',
            'campo': 'nome',
            'total': Demanda.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in Demanda.objects.all()]
        },
        'TipoCQ': {
            'titulo': 'Tipos de CQ',
            'campo': 'nome',
            'total': TipoCQ.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in TipoCQ.objects.all()]
        },
        'NivelCQ': {
            'titulo': 'Níveis de CQ',
            'campo': 'nome',
            'total': NivelCQ.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in NivelCQ.objects.all()]
        },
        'EnsaioCQ': {
            'titulo': 'Ensaios de CQ',
            'campo': 'nome',
            'total': EnsaioCQ.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in EnsaioCQ.objects.all()]
        },
        'PercentualCQ': {
            'titulo': 'Percentuais de CQ',
            'campo': 'percentual',
            'total': PercentualCQ.objects.count(),
            'itens': [{'id': item.id, 'nome': item.percentual} for item in PercentualCQ.objects.all()]
        },
        'TipoMaterial': {
            'titulo': 'Tipos de Material',
            'campo': 'nome',
            'total': TipoMaterial.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in TipoMaterial.objects.all()]
        },
        'StatusDMS': {
            'titulo': 'Status de DMS',
            'campo': 'status',
            'total': StatusDMS.objects.count(),
            'itens': [{'id': item.id, 'nome': item.status} for item in StatusDMS.objects.all()]
        },
        'StatusBMS': {
            'titulo': 'Status de BMS',
            'campo': 'status',
            'total': StatusBMS.objects.count(),
            'itens': [{'id': item.id, 'nome': item.status} for item in StatusBMS.objects.all()]
        },
        'StatusFRS': {
            'titulo': 'Status de FRS',
            'campo': 'status',
            'total': StatusFRS.objects.count(),
            'itens': [{'id': item.id, 'nome': item.status} for item in StatusFRS.objects.all()]
        },
        'NomeDiligenciadorOS': {
            'titulo': 'Diligenciadores de OS',
            'campo': 'nome',
            'total': NomeDiligenciadorOS.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in NomeDiligenciadorOS.objects.all()]
        },
        'NomeResponsavelExecucaoServico': {
            'titulo': 'Responsáveis de Execução',
            'campo': 'nome',
            'total': NomeResponsavelExecucaoServico.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in NomeResponsavelExecucaoServico.objects.all()]
        },
        'ResponsavelMaterial': {
            'titulo': 'Responsáveis de Material',
            'campo': 'nome',
            'total': ResponsavelMaterial.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in ResponsavelMaterial.objects.all()]
        },
        'RegimeOS': {
            'titulo': 'Regimes de OS',
            'campo': 'nome',
            'total': RegimeOS.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in RegimeOS.objects.all()]
        },
        'StatusOS': {
            'titulo': 'Status de OS',
            'campo': 'nome',
            'total': StatusOS.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in StatusOS.objects.all()]
        },
        'StatusOSManual': {
            'titulo': 'Status de OS Manual',
            'campo': 'nome',
            'total': StatusOSManual.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in StatusOSManual.objects.all()]
        },
        'StatusOSEletronica': {
            'titulo': 'Status de OS Eletrônica',
            'campo': 'nome',
            'total': StatusOSEletronica.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in StatusOSEletronica.objects.all()]
        },
        'StatusLevantamento': {
            'titulo': 'Status de Levantamento',
            'campo': 'nome',
            'total': StatusLevantamento.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in StatusLevantamento.objects.all()]
        },
        'StatusProducao': {
            'titulo': 'Status de Produção',
            'campo': 'nome',
            'total': StatusProducao.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in StatusProducao.objects.all()]
        },
        'StatusMaterial': {
            'titulo': 'Status de Material',
            'campo': 'nome',
            'total': StatusMaterial.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in StatusMaterial.objects.all()]
        },
        'TipoDocumentoSolicitacao': {
            'titulo': 'Tipos de Documento de Solicitação',
            'campo': 'nome',
            'total': TipoDocumentoSolicitacao.objects.count(),
            'itens': [{'id': item.id, 'nome': item.nome} for item in TipoDocumentoSolicitacao.objects.all()]
        },
    }
    
    return Response(dados)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def adicionar_item_select_view(request):
    """Adiciona um novo item em um modelo de select"""
    user_groups = [group.name for group in request.user.groups.all()]
    if not any(group in user_groups for group in ['Administrador', 'Superior']):
        return Response({
            'error': 'Acesso negado. Apenas administradores e superiores podem adicionar itens.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    modelo = request.data.get('modelo')
    nome = request.data.get('nome')
    
    if not modelo or not nome:
        return Response({
            'error': 'Modelo e nome são obrigatórios'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Mapeamento de modelos para classes
        modelos_map = {
            'AcaoSolicitacaoOption': AcaoSolicitacaoOption,
            'Demanda': Demanda,
            'TipoCQ': TipoCQ,
            'NivelCQ': NivelCQ,
            'EnsaioCQ': EnsaioCQ,
            'PercentualCQ': PercentualCQ,
            'TipoMaterial': TipoMaterial,
            'StatusDMS': StatusDMS,
            'StatusBMS': StatusBMS,
            'StatusFRS': StatusFRS,
            'NomeDiligenciadorOS': NomeDiligenciadorOS,
            'NomeResponsavelExecucaoServico': NomeResponsavelExecucaoServico,
            'ResponsavelMaterial': ResponsavelMaterial,
            'RegimeOS': RegimeOS,
            'StatusOS': StatusOS,
            'StatusOSManual': StatusOSManual,
            'StatusOSEletronica': StatusOSEletronica,
            'StatusLevantamento': StatusLevantamento,
            'StatusProducao': StatusProducao,
            'StatusMaterial': StatusMaterial,
            'TipoDocumentoSolicitacao': TipoDocumentoSolicitacao,
        }
        
        if modelo not in modelos_map:
            return Response({
                'error': 'Modelo inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ModelClass = modelos_map[modelo]
        
        # Criar o item
        if modelo == 'AcaoSolicitacaoOption':
            item = ModelClass.objects.create(descricao=nome)
        elif modelo == 'PercentualCQ':
            item = ModelClass.objects.create(percentual=nome)
        elif modelo == 'StatusDMS' or modelo == 'StatusBMS' or modelo == 'StatusFRS':
            item = ModelClass.objects.create(status=nome)
        else:
            item = ModelClass.objects.create(nome=nome)
        
        logger.info(f"Item adicionado ao modelo {modelo}: {nome} por {request.user.username}")
        
        return Response({
            'message': 'Item adicionado com sucesso',
            'item': {'id': item.id, 'nome': nome}
        })
        
    except Exception as e:
        logger.error(f"Erro ao adicionar item: {e}")
        return Response({
            'error': 'Erro ao adicionar item'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def editar_item_select_view(request):
    """Edita um item em um modelo de select"""
    user_groups = [group.name for group in request.user.groups.all()]
    if not any(group in user_groups for group in ['Administrador', 'Superior']):
        return Response({
            'error': 'Acesso negado. Apenas administradores e superiores podem editar itens.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    modelo = request.data.get('modelo')
    item_id = request.data.get('item_id')
    nome = request.data.get('nome')
    
    if not modelo or not item_id or not nome:
        return Response({
            'error': 'Modelo, item_id e nome são obrigatórios'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Mapeamento de modelos para classes
        modelos_map = {
            'AcaoSolicitacaoOption': AcaoSolicitacaoOption,
            'Demanda': Demanda,
            'TipoCQ': TipoCQ,
            'NivelCQ': NivelCQ,
            'EnsaioCQ': EnsaioCQ,
            'PercentualCQ': PercentualCQ,
            'TipoMaterial': TipoMaterial,
            'StatusDMS': StatusDMS,
            'StatusBMS': StatusBMS,
            'StatusFRS': StatusFRS,
            'NomeDiligenciadorOS': NomeDiligenciadorOS,
            'NomeResponsavelExecucaoServico': NomeResponsavelExecucaoServico,
            'ResponsavelMaterial': ResponsavelMaterial,
            'RegimeOS': RegimeOS,
            'StatusOS': StatusOS,
            'StatusOSManual': StatusOSManual,
            'StatusOSEletronica': StatusOSEletronica,
            'StatusLevantamento': StatusLevantamento,
            'StatusProducao': StatusProducao,
            'StatusMaterial': StatusMaterial,
            'TipoDocumentoSolicitacao': TipoDocumentoSolicitacao,
        }
        
        if modelo not in modelos_map:
            return Response({
                'error': 'Modelo inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ModelClass = modelos_map[modelo]
        
        # Buscar e atualizar o item
        item = ModelClass.objects.get(id=item_id)
        
        if modelo == 'AcaoSolicitacaoOption':
            item.descricao = nome
        elif modelo == 'PercentualCQ':
            item.percentual = nome
        elif modelo == 'StatusDMS' or modelo == 'StatusBMS' or modelo == 'StatusFRS':
            item.status = nome
        else:
            item.nome = nome
        
        item.save()
        
        logger.info(f"Item editado no modelo {modelo}: {nome} por {request.user.username}")
        
        return Response({
            'message': 'Item editado com sucesso',
            'item': {'id': item.id, 'nome': nome}
        })
        
    except ModelClass.DoesNotExist:
        return Response({
            'error': 'Item não encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao editar item: {e}")
        return Response({
            'error': 'Erro ao editar item'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def excluir_item_select_view(request):
    """Exclui um item em um modelo de select (apenas administradores)"""
    if not request.user.groups.filter(name='Administrador').exists():
        return Response({
            'error': 'Acesso negado. Apenas administradores podem excluir itens.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    modelo = request.data.get('modelo')
    item_id = request.data.get('item_id')
    
    if not modelo or not item_id:
        return Response({
            'error': 'Modelo e item_id são obrigatórios'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Mapeamento de modelos para classes
        modelos_map = {
            'AcaoSolicitacaoOption': AcaoSolicitacaoOption,
            'Demanda': Demanda,
            'TipoCQ': TipoCQ,
            'NivelCQ': NivelCQ,
            'EnsaioCQ': EnsaioCQ,
            'PercentualCQ': PercentualCQ,
            'TipoMaterial': TipoMaterial,
            'StatusDMS': StatusDMS,
            'StatusBMS': StatusBMS,
            'StatusFRS': StatusFRS,
            'NomeDiligenciadorOS': NomeDiligenciadorOS,
            'NomeResponsavelExecucaoServico': NomeResponsavelExecucaoServico,
            'ResponsavelMaterial': ResponsavelMaterial,
            'RegimeOS': RegimeOS,
            'StatusOS': StatusOS,
            'StatusOSManual': StatusOSManual,
            'StatusOSEletronica': StatusOSEletronica,
            'StatusLevantamento': StatusLevantamento,
            'StatusProducao': StatusProducao,
            'StatusMaterial': StatusMaterial,
            'TipoDocumentoSolicitacao': TipoDocumentoSolicitacao,
        }
        
        if modelo not in modelos_map:
            return Response({
                'error': 'Modelo inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ModelClass = modelos_map[modelo]
        
        # Buscar e excluir o item
        item = ModelClass.objects.get(id=item_id)
        nome_item = item.descricao if modelo == 'AcaoSolicitacaoOption' else (
            item.percentual if modelo == 'PercentualCQ' else (
                item.status if modelo in ['StatusDMS', 'StatusBMS', 'StatusFRS'] else item.nome
            )
        )
        
        item.delete()
        
        logger.info(f"Item excluído do modelo {modelo}: {nome_item} por {request.user.username}")
        
        return Response({
            'message': 'Item excluído com sucesso'
        })
        
    except ModelClass.DoesNotExist:
        return Response({
            'error': 'Item não encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao excluir item: {e}")
        return Response({
            'error': 'Erro ao excluir item'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

