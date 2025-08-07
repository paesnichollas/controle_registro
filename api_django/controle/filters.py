import django_filters
from django.db.models import Q
from .models import RegistroOS, StatusOS, StatusLevantamento, StatusProducao, RegimeOS


class RegistroOSFilter(django_filters.FilterSet):
    """
    Filtros para Ordem de Serviço
    """
    
    # Filtros por data
    data_criacao_inicio = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    data_criacao_fim = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    data_solicitacao_inicio = django_filters.DateFilter(field_name='data_solicitacao_os', lookup_expr='gte')
    data_solicitacao_fim = django_filters.DateFilter(field_name='data_solicitacao_os', lookup_expr='lte')
    prazo_inicio = django_filters.DateFilter(field_name='prazo_execucao_servico', lookup_expr='gte')
    prazo_fim = django_filters.DateFilter(field_name='prazo_execucao_servico', lookup_expr='lte')
    
    # Filtros por status - agora usando modelos relacionais
    status_os = django_filters.ModelMultipleChoiceFilter(
        queryset=StatusOS.objects.all(),
        field_name='status_os'
    )
    status_levantamento = django_filters.ModelMultipleChoiceFilter(
        queryset=StatusLevantamento.objects.all(),
        field_name='status_levantamento'
    )
    status_producao = django_filters.ModelMultipleChoiceFilter(
        queryset=StatusProducao.objects.all(),
        field_name='status_producao'
    )
    
    # Filtros por cliente
    nome_cliente = django_filters.ModelMultipleChoiceFilter(
        queryset=RegistroOS._meta.get_field('nome_cliente').remote_field.model.objects.all(),
        field_name='nome_cliente'
    )
    
    # Filtros por regime/prioridade - agora usando modelo relacional
    status_regime_os = django_filters.ModelMultipleChoiceFilter(
        queryset=RegimeOS.objects.all(),
        field_name='status_regime_os'
    )
    
    # Filtros por valores
    valor_minimo = django_filters.NumberFilter(field_name='soma_valores', lookup_expr='gte')
    valor_maximo = django_filters.NumberFilter(field_name='soma_valores', lookup_expr='lte')
    
    # Filtro por usuário responsável
    usuario = django_filters.ModelChoiceFilter(
        field_name='usuario',
        queryset=None  # Será definido no __init__
    )
    
    # Filtro por número da OS
    numero_os = django_filters.NumberFilter(field_name='numero_os')
    numero_os_range = django_filters.NumericRangeFilter(field_name='numero_os')
    
    # Filtro por contrato
    numero_contrato = django_filters.CharFilter(field_name='numero_contrato', lookup_expr='icontains')
    
    # Filtro por existência de orçamento
    existe_orcamento = django_filters.ChoiceFilter(
        choices=RegistroOS.OPCOES_ORCAMENTO,
        field_name='existe_orcamento'
    )
    
    # Filtros por documentos
    tem_documentos_solicitacao = django_filters.BooleanFilter(method='filter_tem_documentos_solicitacao')
    tem_documentos_entrada = django_filters.BooleanFilter(method='filter_tem_documentos_entrada')
    tem_levantamentos = django_filters.BooleanFilter(method='filter_tem_levantamentos')
    tem_notas_fiscais = django_filters.BooleanFilter(method='filter_tem_notas_fiscais')
    
    # Filtro de busca geral
    busca = django_filters.CharFilter(method='filter_busca_geral')
    
    class Meta:
        model = RegistroOS
        fields = {
            'numero_os': ['exact'],
            'nome_cliente__nome': ['exact', 'icontains'],
            'status_os': ['exact'],
            'status_levantamento': ['exact'],
            'status_producao': ['exact'],
            'created_at': ['gte', 'lte'],
            'updated_at': ['gte', 'lte'],
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Definir queryset para filtro de usuário baseado no request
        if hasattr(self, 'request') and self.request:
            from django.contrib.auth.models import User
            self.filters['usuario'].queryset = User.objects.filter(is_active=True)
    
    def filter_tem_documentos_solicitacao(self, queryset, name, value):
        """Filtra OS que têm ou não documentos de solicitação"""
        if value:
            return queryset.filter(documentos_solicitacao__isnull=False).distinct()
        else:
            return queryset.filter(documentos_solicitacao__isnull=True).distinct()
    
    def filter_tem_documentos_entrada(self, queryset, name, value):
        """Filtra OS que têm ou não documentos de entrada"""
        if value:
            return queryset.filter(documentos_entrada__isnull=False).distinct()
        else:
            return queryset.filter(documentos_entrada__isnull=True).distinct()
    
    def filter_tem_levantamentos(self, queryset, name, value):
        """Filtra OS que têm ou não levantamentos"""
        if value:
            return queryset.filter(levantamentos__isnull=False).distinct()
        else:
            return queryset.filter(levantamentos__isnull=True).distinct()
    
    def filter_tem_notas_fiscais(self, queryset, name, value):
        """Filtra OS que têm ou não notas fiscais"""
        if value:
            return queryset.filter(
                Q(notas_fiscais_venda__isnull=False) | 
                Q(notas_fiscais_saida__isnull=False)
            ).distinct()
        else:
            return queryset.filter(
                notas_fiscais_venda__isnull=True,
                notas_fiscais_saida__isnull=True
            ).distinct()
    
    def filter_busca_geral(self, queryset, name, value):
        """Busca geral em múltiplos campos"""
        if not value:
            return queryset
        
        return queryset.filter(
            Q(numero_os__icontains=value) |
            Q(nome_cliente__nome__icontains=value) |
            Q(numero_contrato__icontains=value) |
            Q(descricao_resumida__icontains=value) |
            Q(descricao_detalhada__icontains=value) |
            Q(nome_solicitante_cliente__nome__icontains=value) |
            Q(nome_responsavel_aprovacao_os_cliente__nome__icontains=value) |
            Q(nome_responsavel_execucao_servico__nome__icontains=value) |
            Q(status_os__nome__icontains=value) |
            Q(observacao__icontains=value)
        ).distinct()


class DateRangeFilter(django_filters.FilterSet):
    """
    Filtro genérico para intervalos de data
    """
    
    data_inicio = django_filters.DateFilter(method='filter_data_inicio')
    data_fim = django_filters.DateFilter(method='filter_data_fim')
    
    def filter_data_inicio(self, queryset, name, value):
        """Filtra registros a partir de uma data"""
        return queryset.filter(created_at__gte=value)
    
    def filter_data_fim(self, queryset, name, value):
        """Filtra registros até uma data"""
        return queryset.filter(created_at__lte=value)


class StatusFilter(django_filters.FilterSet):
    """
    Filtro genérico para status
    """
    
    status_ativo = django_filters.BooleanFilter(method='filter_status_ativo')
    
    def filter_status_ativo(self, queryset, name, value):
        """Filtra por status ativo/inativo"""
        if value:
            return queryset.exclude(
                status_os__nome__in=['CANCELADO', 'CONCLUIDO', 'SUSPENSO']
            )
        else:
            return queryset.filter(
                status_os__nome__in=['CANCELADO', 'CONCLUIDO', 'SUSPENSO']
            )

