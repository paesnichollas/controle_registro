from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.db import transaction, models

from django.core.exceptions import ValidationError
from .models import (
    RegistroOS, DocumentoSolicitacao, DataPrevistaEntrega, AcaoSolicitacao,
    ControleQualidade, OrdemCliente, DocumentoEntrada, Levantamento, Material,
    Gmi, Gme, Rtip, Rtm, Dms, Bms, Frs, NfSaida, NfVenda, Cliente, Demanda,
    NomeDiligenciadorOS, NomeResponsavelExecucaoServico, Contrato, UnidadeCliente, SetorUnidadeCliente, AprovadorCliente, SolicitanteCliente, OpcaoEspecCQ
)
from .models import (
    TipoCQ, NivelCQ, EnsaioCQ,
    AcaoSolicitacaoOption, PercentualCQ, TipoMaterial, StatusDMS, StatusBMS, StatusFRS,
    ResponsavelMaterial, RegimeOS, StatusOS, StatusOSManual, StatusOSEletronica,
    StatusLevantamento, StatusProducao, StatusMaterial, TipoDocumentoSolicitacao,
)
import logging

logger = logging.getLogger(__name__)

class FlexibleFileField(serializers.FileField):
    """Campo de arquivo que aceita tanto arquivos quanto strings (URLs de arquivos existentes)"""
    
    def to_internal_value(self, data):
        """Processa dados que podem ser arquivos ou strings"""
        if data is None:
            return None
        
        # Se é uma string, tratar como URL de arquivo existente
        if isinstance(data, str):
            # Retornar a string para que o Django mantenha o arquivo atual
            return data
        
        # Se é um arquivo, processar normalmente
        if hasattr(data, 'size'):
            return super().to_internal_value(data)
        
        # Se chegou aqui, é um tipo inválido
        raise serializers.ValidationError(f'Arquivo inválido. Tipo recebido: {type(data)}')
    
    def to_representation(self, value):
        """Representação personalizada para garantir URLs corretas"""
        if value:
            return normalize_file_url(str(value))
        return value

class FlexibleDateTimeField(serializers.DateTimeField):
    """Campo de data/hora que aceita múltiplos formatos"""
    
    def to_internal_value(self, value):
        if not value:
            return None
            
        if isinstance(value, str):
            # Tentar diferentes formatos
            formats_to_try = [
                '%Y-%m-%dT%H:%M:%S.%fZ',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M',
                '%d/%m/%Y %H:%M',
                '%d/%m/%Y',
                '%d-%m-%Y %H:%M',
                '%d-%m-%Y',
                '%d.%m.%Y %H:%M',
                '%d.%m.%Y',
            ]
            
            from datetime import datetime
            for fmt in formats_to_try:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
            
            # Se nenhum formato funcionar, tentar parse_datetime do Django
            try:
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(value)
                if parsed:
                    return parsed
            except:
                pass
                
            raise serializers.ValidationError(
                f'Formato inválido para data e hora: {value}. '
                f'Use um dos formatos aceitos.'
            )
        
        return super().to_internal_value(value)


class UserSerializer(serializers.ModelSerializer):
    """Serializer para informações do usuário"""
    groups = serializers.StringRelatedField(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined', 'groups']
        read_only_fields = ['id', 'groups']


# Serializers aninhados para criação/edição
# Função auxiliar para validação de arquivos
def validate_file_field(value, field_name):
    """Validação padronizada para campos de arquivo"""
    if value is None:
        return None
    
    # Se é uma string (URL de arquivo existente), tratar como "sem alteração"
    if isinstance(value, str):
        # Para strings, retornar a string em vez de None para que o Django mantenha o arquivo atual
        # Isso é necessário porque o Django espera um valor válido ou None para limpar o campo
        return value
    
    # Se é um arquivo, validar
    if hasattr(value, 'size'):
        if value.size == 0:
            raise serializers.ValidationError('Arquivo vazio não é permitido.')
        return value
    
    # Se chegou aqui, é um tipo inválido
    raise serializers.ValidationError(f'Arquivo inválido. Tipo recebido: {type(value)}')

def normalize_file_url(file_path):
    """Normaliza URLs de arquivo para caminho relativo"""
    if not file_path:
        return file_path
    
    # Se é uma URL completa, extrair apenas o caminho relativo
    if file_path.startswith('http://') or file_path.startswith('https://'):
        from urllib.parse import urlparse
        parsed = urlparse(file_path)
        return parsed.path
    elif file_path.startswith('/media/'):
        # Manter o prefixo /media/ se presente, pois o frontend espera isso
        return file_path
    
    return file_path

class DocumentoSolicitacaoNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para documentos de solicitação"""
    
    # Campo ForeignKey para tipo de documento
    tipo_documento_solicitacao = serializers.PrimaryKeyRelatedField(queryset=TipoDocumentoSolicitacao.objects.all(), required=False, allow_null=True)
    
    documento_solicitacao = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('documento_solicitacao'):
            data['documento_solicitacao'] = normalize_file_url(data['documento_solicitacao'])
        
        return data
    
    def validate_documento_solicitacao(self, value):
        """Validação customizada para o campo documento_solicitacao"""
        return validate_file_field(value, 'documento_solicitacao')
    
    class Meta:
        model = DocumentoSolicitacao
        fields = ['id', 'tipo_documento_solicitacao', 'documento_solicitacao']
        read_only_fields = ['id']


class DataPrevistaEntregaNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para datas previstas de entrega"""
    
    data_prevista_entrega = FlexibleDateTimeField(
        required=False,
        allow_null=True,
    )
    
    class Meta:
        model = DataPrevistaEntrega
        fields = ['id', 'data_prevista_entrega', 'descricao']
        read_only_fields = ['id']


class AcaoSolicitacaoNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para ações de solicitação"""
    
    # Campo ForeignKey para ação de solicitação
    acao_solicitacao = serializers.PrimaryKeyRelatedField(queryset=AcaoSolicitacaoOption.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = AcaoSolicitacao
        fields = ['id', 'acao_solicitacao']
        read_only_fields = ['id']


class ControleQualidadeNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para controle de qualidade"""
    tipo_cq = serializers.PrimaryKeyRelatedField(queryset=TipoCQ.objects.all(), required=False, allow_null=True)
    opcoes_espec_cq = serializers.PrimaryKeyRelatedField(queryset=OpcaoEspecCQ.objects.all(), required=False, allow_null=True)
    nivel_inspecao_cq = serializers.PrimaryKeyRelatedField(queryset=NivelCQ.objects.all(), required=False, allow_null=True)
    tipo_ensaio_cq = serializers.PrimaryKeyRelatedField(queryset=EnsaioCQ.objects.all(), required=False, allow_null=True)
    percentual_cq = serializers.PrimaryKeyRelatedField(queryset=PercentualCQ.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = ControleQualidade
        fields = [
            'id', 'tipo_cq', 'opcoes_espec_cq', 'nivel_inspecao_cq', 
            'tipo_ensaio_cq', 'percentual_cq', 'quantidade_cq', 
            'tamanho_cq', 'texto_tamanho_cq'
        ]
        read_only_fields = ['id']


class OrdemClienteNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para ordens do cliente"""
    
    class Meta:
        model = OrdemCliente
        fields = ['id', 'numero_ordem', 'descricao']
        read_only_fields = ['id']


class DocumentoEntradaNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para documentos de entrada"""
    
    documento_entrada = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('documento_entrada'):
            data['documento_entrada'] = normalize_file_url(data['documento_entrada'])
        
        return data
    
    def validate_documento_entrada(self, value):
        """Validação customizada para o campo documento_entrada"""
        return validate_file_field(value, 'documento_entrada')
    
    class Meta:
        model = DocumentoEntrada
        fields = ['id', 'documento_entrada', 'numero_documento_entrada', 'data_documento_entrada']
        read_only_fields = ['id']


class LevantamentoNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para levantamentos"""
    
    arquivo_anexo_levantamento = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_levantamento'):
            data['arquivo_anexo_levantamento'] = normalize_file_url(data['arquivo_anexo_levantamento'])
        
        return data
    
    def validate_arquivo_anexo_levantamento(self, value):
        """Validação customizada para o campo arquivo_anexo_levantamento"""
        return validate_file_field(value, 'arquivo_anexo_levantamento')
    
    class Meta:
        model = Levantamento
        fields = ['id', 'data_levantamento', 'descricao_levantamento', 'arquivo_anexo_levantamento']
        read_only_fields = ['id']


class MaterialNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para materiais"""
    
    # Campos ForeignKey para materiais
    tipo_material = serializers.PrimaryKeyRelatedField(queryset=TipoMaterial.objects.all(), required=False, allow_null=True)
    status_material = serializers.PrimaryKeyRelatedField(queryset=StatusMaterial.objects.all(), required=False, allow_null=True)
    responsavel_material = serializers.PrimaryKeyRelatedField(queryset=ResponsavelMaterial.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Material
        fields = [
            'id', 'tipo_material', 'status_material', 'responsavel_material'
        ]
        read_only_fields = ['id']


class GmiNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para GMI"""
    data_gmi = serializers.DateTimeField(
        error_messages={
            'required': 'A data do GMI é obrigatória.',
            'invalid': 'Data do GMI inválida.'
        }
    )
    descricao_gmi = serializers.CharField(
        error_messages={
            'required': 'A descrição do GMI é obrigatória.',
            'blank': 'A descrição do GMI não pode ser vazia.'
        }
    )
    arquivo_anexo_gmi = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_gmi'):
            data['arquivo_anexo_gmi'] = normalize_file_url(data['arquivo_anexo_gmi'])
        
        return data
    
    def validate_arquivo_anexo_gmi(self, value):
        """Validação customizada para o campo arquivo_anexo_gmi"""
        return validate_file_field(value, 'arquivo_anexo_gmi')
    
    class Meta:
        model = Gmi
        fields = ['id', 'data_gmi', 'descricao_gmi', 'arquivo_anexo_gmi']
        read_only_fields = ['id']


class GmeNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para GME"""
    
    arquivo_anexo_gme = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_gme'):
            data['arquivo_anexo_gme'] = normalize_file_url(data['arquivo_anexo_gme'])
        
        return data
    
    def validate_arquivo_anexo_gme(self, value):
        """Validação customizada para o campo arquivo_anexo_gme"""
        return validate_file_field(value, 'arquivo_anexo_gme')
    
    class Meta:
        model = Gme
        fields = ['id', 'data_gme', 'descricao_gme', 'arquivo_anexo_gme']
        read_only_fields = ['id']


class RtipNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para RTIP"""
    data_rtip = serializers.DateTimeField(
        error_messages={
            'required': 'A data do RTIP é obrigatória.',
            'invalid': 'Data do RTIP inválida.'
        }
    )
    descricao_rtip = serializers.CharField(
        error_messages={
            'required': 'A descrição do RTIP é obrigatória.',
            'blank': 'A descrição do RTIP não pode ser vazia.'
        }
    )
    arquivo_anexo_rtip = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_rtip'):
            data['arquivo_anexo_rtip'] = normalize_file_url(data['arquivo_anexo_rtip'])
        
        return data
    
    def validate_arquivo_anexo_rtip(self, value):
        """Validação customizada para o campo arquivo_anexo_rtip"""
        return validate_file_field(value, 'arquivo_anexo_rtip')
    
    class Meta:
        model = Rtip
        fields = ['id', 'data_rtip', 'descricao_rtip', 'arquivo_anexo_rtip']
        read_only_fields = ['id']


class RtmNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para RTM"""
    
    arquivo_anexo_rtm = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_rtm'):
            data['arquivo_anexo_rtm'] = normalize_file_url(data['arquivo_anexo_rtm'])
        
        return data
    
    def validate_arquivo_anexo_rtm(self, value):
        """Validação customizada para o campo arquivo_anexo_rtm"""
        return validate_file_field(value, 'arquivo_anexo_rtm')
    
    class Meta:
        model = Rtm
        fields = ['id', 'data_rtm', 'descricao_rtm', 'arquivo_anexo_rtm']
        read_only_fields = ['id']


class DmsNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para DMS"""
    
    # Campo ForeignKey para status DMS
    status_dms = serializers.PrimaryKeyRelatedField(queryset=StatusDMS.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Dms
        fields = ['id', 'status_dms', 'numero_dms', 'data_aprovacao_dms']
        read_only_fields = ['id']


class BmsNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para BMS"""
    
    # Campo ForeignKey para status BMS
    status_bms = serializers.PrimaryKeyRelatedField(queryset=StatusBMS.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Bms
        fields = ['id', 'status_bms', 'numero_bms', 'data_aprovacao_bms']
        read_only_fields = ['id']


class FrsNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para FRS"""
    
    # Campo ForeignKey para status FRS
    status_frs = serializers.PrimaryKeyRelatedField(queryset=StatusFRS.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Frs
        fields = ['id', 'status_frs', 'numero_frs', 'data_aprovacao_frs']
        read_only_fields = ['id']


class NfSaidaNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para notas fiscais de saída"""
    
    arquivo_anexo_nota_fiscal_remessa_saida = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_nota_fiscal_remessa_saida'):
            data['arquivo_anexo_nota_fiscal_remessa_saida'] = normalize_file_url(data['arquivo_anexo_nota_fiscal_remessa_saida'])
        
        return data
    
    def validate_arquivo_anexo_nota_fiscal_remessa_saida(self, value):
        """Validação customizada para o campo arquivo_anexo_nota_fiscal_remessa_saida"""
        return validate_file_field(value, 'arquivo_anexo_nota_fiscal_remessa_saida')
    
    class Meta:
        model = NfSaida
        fields = [
            'id', 'numero_nota_fiscal_remessa_saida', 
            'arquivo_anexo_nota_fiscal_remessa_saida', 
            'data_nota_fiscal_remessa_saida'
        ]
        read_only_fields = ['id']


class NfVendaNestedSerializer(serializers.ModelSerializer):
    """Serializer aninhado para notas fiscais de venda"""
    
    arquivo_anexo_nota_fiscal_venda = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_nota_fiscal_venda'):
            data['arquivo_anexo_nota_fiscal_venda'] = normalize_file_url(data['arquivo_anexo_nota_fiscal_venda'])
        
        return data
    
    def validate_arquivo_anexo_nota_fiscal_venda(self, value):
        """Validação customizada para o campo arquivo_anexo_nota_fiscal_venda"""
        return validate_file_field(value, 'arquivo_anexo_nota_fiscal_venda')
    
    class Meta:
        model = NfVenda
        fields = [
            'id', 'numero_nota_fiscal_venda', 'preco_nota_fiscal_venda',
            'arquivo_anexo_nota_fiscal_venda', 'data_nota_fiscal_venda'
        ]
        read_only_fields = ['id']


# ListSerializers customizados para update
class DocumentoSolicitacaoListSerializer(serializers.ListSerializer):
    """ListSerializer customizado para DocumentoSolicitacao"""
    
    def update(self, instance, validated_data):
        # Mapear instâncias existentes por ID
        instance_mapping = {item.id: item for item in instance}
        data_mapping = {item.get('id'): item for item in validated_data if item.get('id')}
        
        # Atualizar instâncias existentes
        ret = []
        for item_id, data in data_mapping.items():
            if item_id in instance_mapping:
                item = instance_mapping[item_id]
                ret.append(self.child.update(item, data))
        
        # Criar novas instâncias
        for data in validated_data:
            if not data.get('id'):
                ret.append(self.child.create(data))
        
        # Deletar instâncias não incluídas
        for item_id, item in instance_mapping.items():
            if item_id not in data_mapping:
                item.delete()
        
        return ret


# Aplicar ListSerializer customizado aos serializers aninhados
DocumentoSolicitacaoNestedSerializer.Meta.list_serializer_class = DocumentoSolicitacaoListSerializer


# Serializers completos para endpoints individuais
class DocumentoSolicitacaoSerializer(serializers.ModelSerializer):
    """Serializer para documentos de solicitação"""
    
    # Campo ForeignKey para tipo de documento
    tipo_documento_solicitacao = serializers.PrimaryKeyRelatedField(queryset=TipoDocumentoSolicitacao.objects.all(), required=False, allow_null=True)
    
    documento_solicitacao = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('documento_solicitacao'):
            data['documento_solicitacao'] = normalize_file_url(data['documento_solicitacao'])
        
        return data
    
    def validate_documento_solicitacao(self, value):
        """Validação customizada para o campo documento_solicitacao"""
        return validate_file_field(value, 'documento_solicitacao')
    
    class Meta:
        model = DocumentoSolicitacao
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class DataPrevistaEntregaSerializer(serializers.ModelSerializer):
    """Serializer para datas previstas de entrega"""
    
    class Meta:
        model = DataPrevistaEntrega
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class AcaoSolicitacaoSerializer(serializers.ModelSerializer):
    """Serializer para ações de solicitação"""
    
    # Campo ForeignKey para ação de solicitação
    acao_solicitacao = serializers.PrimaryKeyRelatedField(queryset=AcaoSolicitacaoOption.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = AcaoSolicitacao
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ControleQualidadeSerializer(serializers.ModelSerializer):
    """Serializer para controle de qualidade"""
    
    class Meta:
        model = ControleQualidade
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class OrdemClienteSerializer(serializers.ModelSerializer):
    """Serializer para ordens do cliente"""
    
    class Meta:
        model = OrdemCliente
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class DocumentoEntradaSerializer(serializers.ModelSerializer):
    """Serializer para documentos de entrada"""
    
    documento_entrada = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('documento_entrada'):
            data['documento_entrada'] = normalize_file_url(data['documento_entrada'])
        
        return data
    
    def validate_documento_entrada(self, value):
        """Validação customizada para o campo documento_entrada"""
        return validate_file_field(value, 'documento_entrada')
    
    class Meta:
        model = DocumentoEntrada
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class LevantamentoSerializer(serializers.ModelSerializer):
    """Serializer para levantamentos"""
    
    arquivo_anexo_levantamento = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_levantamento'):
            data['arquivo_anexo_levantamento'] = normalize_file_url(data['arquivo_anexo_levantamento'])
        
        return data
    
    def validate_arquivo_anexo_levantamento(self, value):
        """Validação customizada para o campo arquivo_anexo_levantamento"""
        return validate_file_field(value, 'arquivo_anexo_levantamento')
    
    class Meta:
        model = Levantamento
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class MaterialSerializer(serializers.ModelSerializer):
    """Serializer para materiais"""
    
    # Campos ForeignKey para materiais
    tipo_material = serializers.PrimaryKeyRelatedField(queryset=TipoMaterial.objects.all(), required=False, allow_null=True)
    status_material = serializers.PrimaryKeyRelatedField(queryset=StatusMaterial.objects.all(), required=False, allow_null=True)
    responsavel_material = serializers.PrimaryKeyRelatedField(queryset=ResponsavelMaterial.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class GmiSerializer(serializers.ModelSerializer):
    """Serializer para GMI"""
    
    arquivo_anexo_gmi = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_gmi'):
            data['arquivo_anexo_gmi'] = normalize_file_url(data['arquivo_anexo_gmi'])
        
        return data
    
    def validate_arquivo_anexo_gmi(self, value):
        """Validação customizada para o campo arquivo_anexo_gmi"""
        return validate_file_field(value, 'arquivo_anexo_gmi')
    
    class Meta:
        model = Gmi
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class GmeSerializer(serializers.ModelSerializer):
    """Serializer para GME"""
    
    arquivo_anexo_gme = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_gme'):
            data['arquivo_anexo_gme'] = normalize_file_url(data['arquivo_anexo_gme'])
        
        return data
    
    def validate_arquivo_anexo_gme(self, value):
        """Validação customizada para o campo arquivo_anexo_gme"""
        return validate_file_field(value, 'arquivo_anexo_gme')
    
    class Meta:
        model = Gme
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RtipSerializer(serializers.ModelSerializer):
    """Serializer para RTIP"""
    
    arquivo_anexo_rtip = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_rtip'):
            data['arquivo_anexo_rtip'] = normalize_file_url(data['arquivo_anexo_rtip'])
        
        return data
    
    def validate_arquivo_anexo_rtip(self, value):
        """Validação customizada para o campo arquivo_anexo_rtip"""
        return validate_file_field(value, 'arquivo_anexo_rtip')
    
    class Meta:
        model = Rtip
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RtmSerializer(serializers.ModelSerializer):
    """Serializer para RTM"""
    
    arquivo_anexo_rtm = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_rtm'):
            data['arquivo_anexo_rtm'] = normalize_file_url(data['arquivo_anexo_rtm'])
        
        return data
    
    def validate_arquivo_anexo_rtm(self, value):
        """Validação customizada para o campo arquivo_anexo_rtm"""
        return validate_file_field(value, 'arquivo_anexo_rtm')
    
    class Meta:
        model = Rtm
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class DmsSerializer(serializers.ModelSerializer):
    """Serializer para DMS"""
    
    class Meta:
        model = Dms
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class BmsSerializer(serializers.ModelSerializer):
    """Serializer para BMS"""
    
    class Meta:
        model = Bms
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class FrsSerializer(serializers.ModelSerializer):
    """Serializer para FRS"""
    
    class Meta:
        model = Frs
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class NfSaidaSerializer(serializers.ModelSerializer):
    """Serializer para notas fiscais de saída"""
    
    arquivo_anexo_nota_fiscal_remessa_saida = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_nota_fiscal_remessa_saida'):
            data['arquivo_anexo_nota_fiscal_remessa_saida'] = normalize_file_url(data['arquivo_anexo_nota_fiscal_remessa_saida'])
        
        return data
    
    def validate_arquivo_anexo_nota_fiscal_remessa_saida(self, value):
        """Validação customizada para o campo arquivo_anexo_nota_fiscal_remessa_saida"""
        return validate_file_field(value, 'arquivo_anexo_nota_fiscal_remessa_saida')
    
    class Meta:
        model = NfSaida
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class NfVendaSerializer(serializers.ModelSerializer):
    """Serializer para notas fiscais de venda"""
    
    arquivo_anexo_nota_fiscal_venda = FlexibleFileField(
        required=False,
        allow_null=True,
        allow_empty_file=True
    )
    
    def to_representation(self, instance):
        """Representação personalizada para garantir URLs corretas"""
        data = super().to_representation(instance)
        
        # Se há um arquivo, garantir que seja apenas o caminho relativo
        if data.get('arquivo_anexo_nota_fiscal_venda'):
            data['arquivo_anexo_nota_fiscal_venda'] = normalize_file_url(data['arquivo_anexo_nota_fiscal_venda'])
        
        return data
    
    def validate_arquivo_anexo_nota_fiscal_venda(self, value):
        """Validação customizada para o campo arquivo_anexo_nota_fiscal_venda"""
        return validate_file_field(value, 'arquivo_anexo_nota_fiscal_venda')
    
    class Meta:
        model = NfVenda
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RegistroOSSerializer(serializers.ModelSerializer):
    """Serializer principal para Ordem de Serviço com serialização aninhada
    
    IMPORTANTE: Este serializer aplica validações diferenciadas por grupo de usuário:
    - Administrador/Superior: Todos os campos são opcionais
    - Básico/Qualidade: Regras específicas de obrigatoriedade são mantidas
    """
    
    # Campos relacionados aninhados
    documentos_solicitacao = DocumentoSolicitacaoNestedSerializer(many=True, required=False)
    datas_previstas = DataPrevistaEntregaNestedSerializer(many=True, required=False)
    acoes_solicitacao = AcaoSolicitacaoNestedSerializer(many=True, required=False)
    controles_qualidade = ControleQualidadeNestedSerializer(many=True, required=False)
    ordens_cliente = OrdemClienteNestedSerializer(many=True, required=False)
    documentos_entrada = DocumentoEntradaNestedSerializer(many=True, required=False)
    levantamentos = LevantamentoNestedSerializer(many=True, required=False)
    materiais = MaterialNestedSerializer(many=True, required=False)
    gmis = GmiNestedSerializer(many=True, required=False)
    gmes = GmeNestedSerializer(many=True, required=False)
    rtips = RtipNestedSerializer(many=True, required=False)
    rtms = RtmNestedSerializer(many=True, required=False)
    dms = DmsNestedSerializer(many=True, required=False)
    bms = BmsNestedSerializer(many=True, required=False)
    frs = FrsNestedSerializer(many=True, required=False)
    notas_fiscais_saida = NfSaidaNestedSerializer(many=True, required=False)
    notas_fiscais_venda = NfVendaNestedSerializer(many=True, required=False)
    
    # Informações do usuário
    usuario_info = UserSerializer(source='usuario', read_only=True)
    data_criacao = serializers.DateTimeField(source='created_at', read_only=True)
    
    # Campos de data específicos para aceitar múltiplos formatos
    data_solicitacao_os = FlexibleDateTimeField(
        required=False, 
        allow_null=True,
    )
    data_emissao_os = FlexibleDateTimeField(
        required=False, 
        allow_null=True,
    )
    prazo_execucao_servico = FlexibleDateTimeField(
        required=False, 
        allow_null=True,
    )
    
    # Configuração para busca em campos relacionados
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.nome_cliente:
            representation['nome_cliente_nome'] = instance.nome_cliente.nome
        return representation

    nome_diligenciador_os = serializers.PrimaryKeyRelatedField(queryset=NomeDiligenciadorOS.objects.all(), required=False, allow_null=True)
    nome_solicitante_cliente = serializers.PrimaryKeyRelatedField(queryset=SolicitanteCliente.objects.all(), required=False, allow_null=True)
    nome_responsavel_aprovacao_os_cliente = serializers.PrimaryKeyRelatedField(queryset=AprovadorCliente.objects.all(), required=False, allow_null=True)
    nome_responsavel_execucao_servico = serializers.PrimaryKeyRelatedField(queryset=NomeResponsavelExecucaoServico.objects.all(), required=False, allow_null=True)
    id_demanda = serializers.PrimaryKeyRelatedField(queryset=Demanda.objects.all(), required=False, allow_null=True)
    
    # Novos campos ForeignKey para status
    status_regime_os = serializers.PrimaryKeyRelatedField(queryset=RegimeOS.objects.all(), required=False, allow_null=True)
    status_os = serializers.PrimaryKeyRelatedField(queryset=StatusOS.objects.all(), required=False, allow_null=True)
    status_os_manual = serializers.PrimaryKeyRelatedField(queryset=StatusOSManual.objects.all(), required=False, allow_null=True)
    status_os_eletronica = serializers.PrimaryKeyRelatedField(queryset=StatusOSEletronica.objects.all(), required=False, allow_null=True)
    status_levantamento = serializers.PrimaryKeyRelatedField(queryset=StatusLevantamento.objects.all(), required=False, allow_null=True)
    status_producao = serializers.PrimaryKeyRelatedField(queryset=StatusProducao.objects.all(), required=False, allow_null=True)

    class Meta:
        model = RegistroOS
        fields = '__all__'
        read_only_fields = [
            'id', 'numero_os', 'os_id', 'data_criacao', 'updated_at',
            'soma_valores', 'soma_notas_fiscais', 'saldo_final'
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Obter usuário do contexto após inicialização do serializer
        self.user = self.context.get('user') if self.context else None
        
        # Aplicar validações baseadas no grupo do usuário
        if self.user:
            self._apply_user_group_validations()
    
    def _apply_user_group_validations(self):
        """Aplica validações baseadas no grupo do usuário"""
        if not self.user:
            return
        
        # Verificar grupos do usuário
        user_groups = [group.name for group in self.user.groups.all()]
        is_admin_superior = any(group in user_groups for group in ['Administrador', 'Superior'])
        
        # Para grupos Administrador e Superior, tornar todos os campos opcionais
        if is_admin_superior:
            for field_name, field in self.fields.items():
                if hasattr(field, 'required'):
                    field.required = False
                if hasattr(field, 'allow_null'):
                    field.allow_null = True
        # Para o grupo Qualidade, tornar campos específicos obrigatórios
        if 'Qualidade' in user_groups:
            qualidade_required_fields = [
                'tipo_cq', 'opcoes_espec_cq', 'nivel_inspecao_cq', 'tipo_ensaio_cq',
                'percentual_cq', 'quantidade_cq', 'tamanho_cq', 'texto_tamanho_cq'
            ]
            for field_name in qualidade_required_fields:
                if field_name in self.fields:
                    self.fields[field_name].required = True
        # Para o grupo Básico, tornar campos específicos obrigatórios
        if 'Básico' in user_groups:
            basico_required_fields = [
                'data_solicitacao_os', 'data_emissao_os', 'nome_cliente', 'numero_contrato',
                'unidade_cliente', 'setor_unidade_cliente', 'prazo_execucao_servico',
                'status_regime_os', 'nome_diligenciador_os',
                'nome_solicitante_cliente', 'nome_responsavel_aprovacao_os_cliente',
                'nome_responsavel_execucao_servico', 'id_demanda', 'descricao_resumida',
                'existe_orcamento', 'status_os', 'status_levantamento', 'status_producao',
                'opcoes_dms', 'opcoes_bms', 'opcoes_frs',
                'data_gmi', 'descricao_gmi', 'arquivo_anexo_gmi', 'data_rtip',
                'descricao_rtip', 'arquivo_anexo_rtip'
            ]
            for field_name in basico_required_fields:
                if field_name in self.fields:
                    self.fields[field_name].required = True

    def validate(self, data):
        """Validações customizadas baseadas nas regras de negócio"""
        if not self.user:
            return data
        
        user_groups = [group.name for group in self.user.groups.all()]
        
        # Para updates vazios (PATCH sem alterações), permitir
        if hasattr(self, 'instance') and self.instance is not None:
            # Se é um update e não há dados significativos, permitir
            if not data or len(data) == 0:
                return data
            
            # Se é um update e apenas campos opcionais foram enviados, permitir
            optional_fields = [
                'observacao', 'descricao_detalhada', 'data_assinatura_eletronica_os',
                'numero_os_eletronica', 'soma_valores', 'soma_notas_fiscais', 'saldo_final'
            ]
            if all(key in optional_fields for key in data.keys()):
                return data
        
        if any(g in user_groups for g in ['Administrador', 'Superior']):
            # Não faz validação extra, permite envio vazio
            return data
        
        # Lógica de preenchimento automático do prazo de execução
        if 'data_emissao_os' in data and data['data_emissao_os']:
            # Só calcular automaticamente se o prazo de execução não foi fornecido manualmente
            if 'prazo_execucao_servico' not in data or not data['prazo_execucao_servico']:
                try:
                    from datetime import timedelta
                    # Calcular prazo de execução (30 dias após a data de emissão)
                    prazo_execucao = data['data_emissao_os'] + timedelta(days=30)
                    data['prazo_execucao_servico'] = prazo_execucao
                except Exception as e:
                    # Se houver erro no cálculo, não interromper o processo
                    pass
        elif 'data_emissao_os' in data and not data['data_emissao_os']:
            # Se a data de emissão for limpa, limpar também o prazo de execução
            # Mas só se o prazo não foi fornecido manualmente
            if 'prazo_execucao_servico' not in data or not data['prazo_execucao_servico']:
                data['prazo_execucao_servico'] = None
        
        # Validações condicionais por grupo de usuário
        self._validate_by_user_group(data, user_groups)
        
        # Validações para campos relacionados a formsets dinâmicos
        self._validate_dynamic_formsets(data)
        
        return data
    
    def _validate_by_user_group(self, data, user_groups):
        """Validações condicionais por grupo de usuário"""
        # Se o usuário for do grupo "Administrador" ou "Superior", não exige nada
        if any(g in user_groups for g in ['Administrador', 'Superior']):
            return data
            
        # Se o usuário for do grupo "Qualidade"
        if 'Qualidade' in user_groups:
            qualidade_required_fields = [
                'tipo_cq', 'opcoes_espec_cq', 'nivel_inspecao_cq', 'tipo_ensaio_cq',
                'percentual_cq', 'quantidade_cq', 'tamanho_cq', 'texto_tamanho_cq'
            ]
            # Para grupo Qualidade, validar apenas controles de qualidade
            controles = data.get('controles_qualidade') or []
            if not controles or len(controles) == 0:
                raise serializers.ValidationError({
                    'controles_qualidade': 'Pelo menos um controle de qualidade é obrigatório para o grupo Qualidade.'
                })
            for idx, controle in enumerate(controles):
                for field in qualidade_required_fields:
                    if controle.get(field) is None or controle.get(field) == '':
                        raise serializers.ValidationError({
                            f'controles_qualidade[{idx}].{field}': f'Campo obrigatório para o grupo Qualidade.'
                        })
                        
        # Se o usuário for do grupo "Básico"
        if 'Básico' in user_groups:
            # Verificar se é uma atualização (PATCH) ou criação (POST)
            is_update = hasattr(self, 'instance') and self.instance is not None
            
            # Para criação, validar todos os campos obrigatórios
            if not is_update:
                basico_required_fields = [
                    'data_solicitacao_os', 'data_emissao_os', 'nome_cliente', 'numero_contrato',
                    'unidade_cliente', 'setor_unidade_cliente', 'prazo_execucao_servico',
                    'status_regime_os', 'nome_diligenciador_os',
                    'nome_solicitante_cliente', 'nome_responsavel_aprovacao_os_cliente',
                    'nome_responsavel_execucao_servico', 'id_demanda', 'descricao_resumida',
                    'existe_orcamento', 'status_os', 'status_levantamento', 'status_producao',
                    'opcoes_dms', 'opcoes_bms', 'opcoes_frs'
                ]
                for field in basico_required_fields:
                    if data.get(field) is None or data.get(field) == '':
                        raise serializers.ValidationError({
                            field: 'Este campo é obrigatório para usuários do grupo Básico.'
                        })

                # Se existe_orcamento == 'SIM', obrigar campos adicionais
                if data.get('existe_orcamento') == 'SIM':
                    obrigatorios_orcamento = [
                        'peso_fabricacao',
                        'metro_quadrado_pintura_revestimento',
                        'havera_valor_fabricacao',
                        'havera_valor_levantamento',
                        'havera_valor_material_fabricacao',
                        'havera_valor_material_pintura',
                        'havera_valor_servico_pintura_revestimento',
                        'havera_valor_montagem',
                        'havera_valor_material_montagem',
                        'havera_valor_inspecao',
                        'havera_valor_manutencao_valvula',
                        'havera_valor_servico_terceiros',
                    ]
                    for field in obrigatorios_orcamento:
                        if data.get(field) is None or data.get(field) == '':
                            raise serializers.ValidationError({
                                field: 'Este campo é obrigatório quando "Existe Orçamento" é "Sim" para usuários do grupo Básico.'
                            })

        # Campos valor_* se tornam obrigatórios somente se o respectivo havera_valor_* == "Sim"
        campos_valor_condicional = [
            ('havera_valor_fabricacao', 'valor_fabricacao'),
            ('havera_valor_levantamento', 'valor_levantamento'),
            ('havera_valor_material_fabricacao', 'valor_material_fabricacao'),
            ('havera_valor_material_pintura', 'valor_material_pintura'),
            ('havera_valor_servico_pintura_revestimento', 'valor_servico_pintura_revestimento'),
            ('havera_valor_montagem', 'valor_montagem'),
            ('havera_valor_material_montagem', 'valor_material_montagem'),
            ('havera_valor_inspecao', 'valor_inspecao'),
            ('havera_valor_manutencao_valvula', 'valor_manutencao_valvula'),
            ('havera_valor_servico_terceiros', 'valor_servico_terceiros'),
        ]

        for havera_field, valor_field in campos_valor_condicional:
            if data.get(havera_field) == 'SIM':
                if data.get(valor_field) is None or data.get(valor_field) == '' or data.get(valor_field) == []:
                    raise serializers.ValidationError({
                        valor_field: f'O campo {valor_field} é obrigatório quando {havera_field} é "Sim".'
                    })
            elif data.get(havera_field) == 'NAO':
                data[valor_field] = 0  # Definir como 0 se não houver valor

        # Se status_os == "Aprovada": torna campos relacionados obrigatórios
        if data.get('status_os') == 'APROVADA':
            campos_aprovacao_obrigatorios = [
                'status_os_manual', 'data_aprovacao_assinatura_manual',
                'status_os_eletronica', 'data_assinatura_eletronica_os', 'numero_os_eletronica'
            ]
            for field in campos_aprovacao_obrigatorios:
                if data.get(field) is None or data.get(field) == '':
                    raise serializers.ValidationError({
                        field: f'O campo {field} é obrigatório quando o status da OS é "Aprovada".'
                    })
            
            # Campos de formsets dinâmicos também se tornam obrigatórios
            if data.get('ordens_cliente') is None or data.get('ordens_cliente') == []:
                    raise serializers.ValidationError({
                    'ordens_cliente': 'Ordem do cliente é obrigatória quando o status da OS é "Aprovada".'
                })
            if data.get('documentos_entrada') is None or data.get('documentos_entrada') == []:
                raise serializers.ValidationError({
                    'documentos_entrada': 'Documento de entrada é obrigatório quando o status da OS é "Aprovada".'
                })

        # Se status_levantamento == "Concluído" e status_producao == "Concluído": data_levantamento, descricao_levantamento, arquivo_anexo_levantamento obrigatórios
        if data.get('status_levantamento') == 'CONCLUIDO' and data.get('status_producao') == 'CONCLUIDO':
            if data.get('levantamentos') is None or data.get('levantamentos') == []:
                raise serializers.ValidationError({
                    'levantamentos': 'Levantamento é obrigatório quando status_levantamento e status_producao são "Concluído".'
                })
        
        # Se opcoes_dms == "SIM": dms obrigatório
        if data.get('opcoes_dms') == 'SIM':
            if data.get('dms') is None or data.get('dms') == []:
                raise serializers.ValidationError({
                    'dms': 'DMS é obrigatório quando opcoes_dms é "Sim".'
                })
        
        # Se opcoes_bms == "SIM": bms obrigatório
        if data.get('opcoes_bms') == 'SIM':
            if data.get('bms') is None or data.get('bms') == []:
                raise serializers.ValidationError({
                    'bms': 'BMS é obrigatório quando opcoes_bms é "Sim".'
                })
        
        # Se opcoes_frs == "SIM": frs obrigatório
        if data.get('opcoes_frs') == 'SIM':
            if data.get('frs') is None or data.get('frs') == []:
                raise serializers.ValidationError({
                    'frs': 'FRS é obrigatório quando opcoes_frs é "Sim".'
                })

    def _validate_dynamic_formsets(self, data):
        """Validações para formsets dinâmicos"""
        # Exemplo: Se tipo_documento_solicitacao for fornecido, documento_solicitacao também deve ser
        if data.get('documentos_solicitacao'):
            for doc in data['documentos_solicitacao']:
                if doc.get('tipo_documento_solicitacao') and (doc.get('documento_solicitacao') is None or doc.get('documento_solicitacao') == ''):
                    raise serializers.ValidationError({
                        'documentos_solicitacao': 'Documento de solicitação é obrigatório quando o tipo é fornecido.'
                    })

        # Adicionar validações para outros formsets dinâmicos conforme necessário
        # Ex: data_prevista_entrega, acao_solicitacao, tipo_cq, etc.

    def to_internal_value(self, data):
        """Processa dados de entrada, incluindo arquivos em formsets aninhados"""
        # Tratar campos de data especificamente
        self._process_date_fields(data)
        
        # Converte string vazia para None em todos os campos
        for field in self.fields:
            if field in data and data[field] == '':
                data[field] = None
        
        # Processamento especial para formsets com arquivos
        if hasattr(data, 'getlist'):
            # Se é um QueryDict (multipart/form-data), processar arquivos
            processed_data = {}
            
            # Processar campos normais
            for key in data.keys():
                if not key.startswith(('gmis[', 'rtips[', 'gmes[', 'rtms[', 'levantamentos[', 'documentos_entrada[', 'documentos_solicitacao[', 'notas_fiscais_saida[', 'notas_fiscais_venda[', 'datas_previstas[', 'acoes_solicitacao[', 'materiais[', 'controles_qualidade[', 'ordens_cliente[', 'dms[', 'bms[', 'frs[')):
                    processed_data[key] = data[key]
            
            # Processar formsets com arquivos
            self._process_filesets_data(data, processed_data)
            
            return super().to_internal_value(processed_data)
        
        return super().to_internal_value(data)
    
    def _process_date_fields(self, data):
        """Processa campos de data para aceitar múltiplos formatos"""
        date_fields = ['data_solicitacao_os', 'data_emissao_os', 'prazo_execucao_servico']
        
        for field in date_fields:
            if field in data and data[field]:
                if isinstance(data[field], str):
                    # Tentar converter se necessário
                    try:
                        from django.utils.dateparse import parse_datetime
                        parsed = parse_datetime(data[field])
                        if parsed:
                            data[field] = parsed.isoformat()
                    except:
                        # Se falhar na conversão, manter o valor original
                        pass
    
    def _process_filesets_data(self, data, processed_data):
        """Processa dados de formsets que contêm arquivos"""
        filesets = ['gmis', 'rtips', 'gmes', 'rtms', 'levantamentos', 'documentos_entrada', 'documentos_solicitacao', 'notas_fiscais_saida', 'notas_fiscais_venda']
        
        # Adicionar formsets sem arquivos que estavam sendo perdidos
        non_file_formsets = ['datas_previstas', 'acoes_solicitacao', 'materiais', 'controles_qualidade', 'ordens_cliente', 'dms', 'bms', 'frs']
        all_formsets = filesets + non_file_formsets
        
        for fileset in all_formsets:
            fileset_data = []
            index = 0
            
            while True:
                # Verificar se existe dados para este índice
                has_data = False
                fileset_item = {}
                
                # Processar campos do item do fileset
                for key in data.keys():
                    if key.startswith(f'{fileset}[{index}]['):
                        has_data = True
                        field_name = key.replace(f'{fileset}[{index}][', '').replace(']', '')
                        fileset_item[field_name] = data[key]
                
                if not has_data:
                    break
                
                # Processar arquivos específicos apenas para formsets que têm arquivos
                if fileset in filesets:
                    # Verificar se há arquivo para este item
                    for file_key in data.keys():
                        if file_key.startswith(f'{fileset}[{index}][arquivo_anexo_'):
                            field_name = file_key.replace(f'{fileset}[{index}][', '').replace(']', '')
                            fileset_item[field_name] = data[file_key]
                        elif fileset == 'documentos_solicitacao' and file_key.startswith(f'{fileset}[{index}][documento_solicitacao]'):
                            field_name = file_key.replace(f'{fileset}[{index}][', '').replace(']', '')
                            fileset_item[field_name] = data[file_key]
                
                if fileset_item:
                    fileset_data.append(fileset_item)
                
                index += 1
            
            if fileset_data:
                processed_data[fileset] = fileset_data

    def perform_create(self, serializer):
        """Define o usuário na criação da OS"""
        serializer.save(usuario=self.request.user)
    
    def create(self, validated_data):
        """Criação customizada da OS com objetos relacionados"""
        
        # Garantir que o usuário seja definido
        user = self.context.get('user')
        if user and 'usuario' not in validated_data:
            validated_data['usuario'] = user
        
        # Extrair dados dos objetos relacionados
        related_data = self._extract_related_data(validated_data)
        
        # Criar a instância principal
        instance = super().create(validated_data)
        
        # Criar objetos relacionados
        self._create_related_objects(instance, related_data)
        
        # Recalcular valores
        instance.calcular_soma_valores()
        instance.calcular_saldo_final()
        instance.save()
        
        return instance
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Atualização customizada da OS com objetos relacionados"""
        
        # Extrair dados dos objetos relacionados
        related_data = self._extract_related_data(validated_data)
        
        # Atualizar a instância principal
        instance = super().update(instance, validated_data)
        
        # Atualizar objetos relacionados apenas se foram enviados
        if related_data:
            self._update_related_objects(instance, related_data)
        
        # Recalcular valores
        instance.calcular_soma_valores()
        instance.calcular_saldo_final()
        instance.save()
        
        return instance
    
    def _extract_related_data(self, validated_data):
        """Extrai dados dos objetos relacionados do validated_data"""
        related_fields = [
            'documentos_solicitacao', 'datas_previstas', 'acoes_solicitacao',
            'controles_qualidade', 'ordens_cliente', 'documentos_entrada',
            'levantamentos', 'materiais', 'gmis', 'gmes', 'rtips', 'rtms',
            'dms', 'bms', 'frs', 'notas_fiscais_saida', 'notas_fiscais_venda'
        ]
        
        related_data = {}
        for field in related_fields:
            if field in validated_data:
                related_data[field] = validated_data.pop(field)
        
        return related_data
    
    def _create_related_objects(self, instance, related_data):
        """Cria objetos relacionados com tratamento especial para arquivos"""
        model_mapping = {
            'documentos_solicitacao': DocumentoSolicitacao,
            'datas_previstas': DataPrevistaEntrega,
            'acoes_solicitacao': AcaoSolicitacao,
            'controles_qualidade': ControleQualidade,
            'ordens_cliente': OrdemCliente,
            'documentos_entrada': DocumentoEntrada,
            'levantamentos': Levantamento,
            'materiais': Material,
            'gmis': Gmi,
            'gmes': Gme,
            'rtips': Rtip,
            'rtms': Rtm,
            'dms': Dms,
            'bms': Bms,
            'frs': Frs,
            'notas_fiscais_saida': NfSaida,
            'notas_fiscais_venda': NfVenda,
        }
        
        for field_name, data_list in related_data.items():
            if data_list and field_name in model_mapping:
                model_class = model_mapping[field_name]
                
                for i, item_data in enumerate(data_list):
                    # Verificar se há arquivos no item
                    file_fields = self._get_file_fields_for_model(model_class)
                    
                    # Processar arquivos se existirem
                    processed_data = item_data.copy()
                    processed_data['registro'] = instance
                    
                    # Remover campos vazios que podem causar problemas
                    processed_data = {k: v for k, v in processed_data.items() if v is not None and v != ''}
                    
                    # Verificar se há pelo menos um campo obrigatório preenchido
                    # (excluindo campos automáticos como id, created_at, etc.)
                    required_fields = []
                    optional_fields = []
                    for field in model_class._meta.fields:
                        if field.name not in ['id', 'created_at', 'updated_at', 'registro']:
                            if not field.blank and not field.null:
                                required_fields.append(field.name)
                            else:
                                optional_fields.append(field.name)
                    
                    # Se há campos obrigatórios, verificar se pelo menos um está preenchido
                    if required_fields:
                        has_required_data = any(
                            field_name in processed_data and processed_data[field_name] is not None
                            for field_name in required_fields
                        )
                        if not has_required_data:
                            continue
                    # Se não há campos obrigatórios, verificar se pelo menos um campo opcional tem valor
                    elif optional_fields:
                        has_optional_data = any(
                            field_name in processed_data and processed_data[field_name] is not None and processed_data[field_name] != ''
                            for field_name in optional_fields
                        )
                        if not has_optional_data:
                            continue
                    
                    try:
                        # Remover campos que não existem no modelo
                        model_fields = [field.name for field in model_class._meta.fields]
                        processed_data = {k: v for k, v in processed_data.items() if k in model_fields}
                        
                        new_obj = model_class.objects.create(**processed_data)
                    except Exception as e:
                        logger.error(f"Erro ao criar {field_name}: {e}")
                        logger.error(f"Dados: {processed_data}")
                        # Não levantar exceção para não interromper a criação da OS
                        # Apenas logar o erro
                        continue
    
    def _get_file_fields_for_model(self, model_class):
        """Retorna campos de arquivo para um modelo específico"""
        file_fields = []
        for field in model_class._meta.fields:
            if isinstance(field, models.FileField):
                file_fields.append(field.name)
        return file_fields
    

    
    def _update_related_objects(self, instance, related_data):
        """Atualiza objetos relacionados preservando dados existentes"""
        model_mapping = {
            'documentos_solicitacao': DocumentoSolicitacao,
            'datas_previstas': DataPrevistaEntrega,
            'acoes_solicitacao': AcaoSolicitacao,
            'controles_qualidade': ControleQualidade,
            'ordens_cliente': OrdemCliente,
            'documentos_entrada': DocumentoEntrada,
            'levantamentos': Levantamento,
            'materiais': Material,
            'gmis': Gmi,
            'gmes': Gme,
            'rtips': Rtip,
            'rtms': Rtm,
            'dms': Dms,
            'bms': Bms,
            'frs': Frs,
            'notas_fiscais_saida': NfSaida,
            'notas_fiscais_venda': NfVenda,
        }
        
        for field_name, data_list in related_data.items():
            if field_name in model_mapping:
                model_class = model_mapping[field_name]
                
                # Se não há dados para este formset, preservar os existentes
                if not data_list or len(data_list) == 0:
                    continue
                
                # Obter objetos existentes
                existing_objects = list(getattr(instance, field_name).all())
                existing_ids = [obj.id for obj in existing_objects if hasattr(obj, 'id')]
                
                # IDs dos objetos na requisição
                request_ids = [item.get('id') for item in data_list if item.get('id')]
                
                # Remover objetos que não estão mais presentes na requisição
                for obj in existing_objects:
                    if hasattr(obj, 'id') and obj.id not in request_ids:
                        obj.delete()
                
                # Atualizar ou criar objetos
                for i, item_data in enumerate(data_list):
                    item_id = item_data.get('id')
                    processed_data = item_data.copy()
                    processed_data['registro'] = instance
                    
                    # Remover campos vazios que podem causar problemas
                    processed_data = {k: v for k, v in processed_data.items() if v is not None and v != ''}
                    

                    
                    if item_id and item_id in existing_ids:
                        # Atualizar objeto existente
                        try:
                            obj = model_class.objects.get(id=item_id)
                            # Remover campos que não existem no modelo
                            model_fields = [field.name for field in model_class._meta.fields]
                            for key, value in processed_data.items():
                                if key in model_fields and key != 'id':
                                    setattr(obj, key, value)
                            obj.save()
                        except Exception as e:
                            logger.error(f"Erro ao atualizar objeto {item_id}: {e}")
                            # Não levantar exceção para não interromper a atualização
                            continue
                    else:
                        # Criar novo objeto apenas se há dados válidos
                        try:
                            if 'id' in processed_data:
                                del processed_data['id']
                            
                            # Verificar se há pelo menos um campo obrigatório preenchido
                            required_fields = []
                            optional_fields = []
                            for field in model_class._meta.fields:
                                if field.name not in ['id', 'created_at', 'updated_at', 'registro']:
                                    if not field.blank and not field.null:
                                        required_fields.append(field.name)
                                    else:
                                        optional_fields.append(field.name)
                            
                            # Se há campos obrigatórios, verificar se pelo menos um está preenchido
                            has_valid_data = False
                            if required_fields:
                                has_valid_data = any(
                                    field_name in processed_data and processed_data[field_name] is not None
                                    for field_name in required_fields
                                )
                            elif optional_fields:
                                has_valid_data = any(
                                    field_name in processed_data and processed_data[field_name] is not None and processed_data[field_name] != ''
                                    for field_name in optional_fields
                                )
                            
                            if not has_valid_data:
                                continue
                            
                            # Remover campos que não existem no modelo
                            model_fields = [field.name for field in model_class._meta.fields]
                            processed_data = {k: v for k, v in processed_data.items() if k in model_fields}
                            
                            new_obj = model_class.objects.create(**processed_data)
                        except Exception as e:
                            logger.error(f"Erro ao criar novo objeto em {field_name}: {e}")
                            logger.error(f"Dados: {processed_data}")
                            # Não levantar exceção para não interromper a atualização
                            continue


class RegistroOSListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de OS"""
    
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    data_criacao = serializers.DateTimeField(source='created_at', read_only=True)
    total_documentos = serializers.SerializerMethodField()
    valor_total = serializers.SerializerMethodField()
    
    # Campos textuais das ForeignKeys
    status_os_nome = serializers.CharField(source='status_os.nome', read_only=True)
    nome_diligenciador_os_nome = serializers.CharField(source='nome_diligenciador_os.nome', read_only=True)
    nome_cliente_nome = serializers.CharField(source='nome_cliente.nome', read_only=True)
    status_levantamento_nome = serializers.CharField(source='status_levantamento.nome', read_only=True)
    status_producao_nome = serializers.CharField(source='status_producao.nome', read_only=True)
    status_regime_os_nome = serializers.CharField(source='status_regime_os.nome', read_only=True)
    
    class Meta:
        model = RegistroOS
        fields = [
            'id', 'numero_os', 'nome_cliente', 'status_os', 'status_levantamento',
            'status_producao', 'soma_valores', 'saldo_final', 'valor_total', 'data_criacao',
            'updated_at', 'usuario_nome', 'total_documentos', 'numero_contrato',
            'descricao_resumida', 'existe_orcamento', 'status_regime_os',
            'peso_fabricacao', 'metro_quadrado_pintura_revestimento',
            'valor_fabricacao', 'valor_levantamento', 'valor_material_fabricacao',
            'valor_material_pintura', 'valor_servico_pintura_revestimento',
            'valor_montagem', 'valor_material_montagem', 'valor_inspecao',
            'valor_manutencao_valvula', 'valor_servico_terceiros',
            'opcoes_dms', 'opcoes_bms', 'opcoes_frs', 'observacao',
            # Campos textuais das ForeignKeys
            'status_os_nome', 'nome_diligenciador_os_nome', 'nome_cliente_nome',
            'status_levantamento_nome', 'status_producao_nome', 'status_regime_os_nome',
            # Campos de data específicos
            'data_solicitacao_os', 'prazo_execucao_servico'
        ]
    
    def to_representation(self, instance):
        """Representação customizada para incluir nomes textuais"""
        representation = super().to_representation(instance)
        
        # Garantir que os campos textuais estejam sempre presentes
        if instance.nome_cliente:
            representation['nome_cliente_nome'] = instance.nome_cliente.nome
            representation['nome_cliente'] = instance.nome_cliente.nome  # Para compatibilidade
        else:
            representation['nome_cliente_nome'] = None
            representation['nome_cliente'] = None
            
        if instance.status_os:
            representation['status_os_nome'] = instance.status_os.nome
        else:
            representation['status_os_nome'] = None
            
        if instance.nome_diligenciador_os:
            representation['nome_diligenciador_os_nome'] = instance.nome_diligenciador_os.nome
        else:
            representation['nome_diligenciador_os_nome'] = None
            
        if instance.status_levantamento:
            representation['status_levantamento_nome'] = instance.status_levantamento.nome
        else:
            representation['status_levantamento_nome'] = None
            
        if instance.status_producao:
            representation['status_producao_nome'] = instance.status_producao.nome
        else:
            representation['status_producao_nome'] = None
            
        if instance.status_regime_os:
            representation['status_regime_os_nome'] = instance.status_regime_os.nome
        else:
            representation['status_regime_os_nome'] = None
        
        return representation
    
    def get_total_documentos(self, obj):
        """Conta o total de documentos anexados"""
        total = 0
        total += obj.documentos_solicitacao.count()
        total += obj.documentos_entrada.count()
        total += obj.levantamentos.count()
        total += obj.gmis.count()
        total += obj.gmes.count()
        total += obj.rtips.count()
        total += obj.rtms.count()
        total += obj.notas_fiscais_saida.count()
        total += obj.notas_fiscais_venda.count()
        return total
    
    def get_valor_total(self, obj):
        """Retorna o valor total usando saldo_final se disponível, senão soma_valores"""
        if obj.saldo_final and float(obj.saldo_final) > 0:
            return float(obj.saldo_final)
        elif obj.soma_valores:
            return float(obj.soma_valores)
        else:
            return 0.0


class CalculosSerializer(serializers.Serializer):
    """Serializer para recálculos de valores"""
    
    soma_valores = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    soma_notas_fiscais = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    saldo_final = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)


class OpcoesSerializer(serializers.Serializer):
    """Serializer para retornar opções de campos de escolha populadas do banco de dados"""
    
    # Clientes do banco de dados
    clientes = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Status da OS - do modelo RegistroOS
    status_os = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_os_manual = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_os_eletronica = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_levantamento = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_producao = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Regime da OS
    regimes_os = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Opções de valor (Sim/Não)
    opcoes_valor = serializers.ListField(child=serializers.CharField(), read_only=True)
    opcoes_orcamento = serializers.ListField(child=serializers.CharField(), read_only=True)
    opcoes_dms = serializers.ListField(child=serializers.CharField(), read_only=True)
    opcoes_bms = serializers.ListField(child=serializers.CharField(), read_only=True)
    opcoes_frs = serializers.ListField(child=serializers.CharField(), read_only=True)
    opcoes_notas_fiscais = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Tipos de documento
    tipos_documento = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Tipos de material
    tipos_material = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_material = serializers.ListField(child=serializers.CharField(), read_only=True)
    responsaveis_material = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Status de documentos
    status_dms = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_bms = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_frs = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Ações de solicitação
    acoes_solicitacao = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Controle de qualidade
    tipos_cq = serializers.ListField(child=serializers.CharField(), read_only=True)
    niveis_inspecao_cq = serializers.ListField(child=serializers.CharField(), read_only=True)
    tipos_ensaio_cq = serializers.ListField(child=serializers.CharField(), read_only=True)
    percentuais_cq = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Dados do banco de dados
    diligenciadores = serializers.ListField(child=serializers.CharField(), read_only=True)
    solicitantes = serializers.ListField(child=serializers.CharField(), read_only=True)
    responsaveis_cliente = serializers.ListField(child=serializers.CharField(), read_only=True)
    responsaveis_servico = serializers.ListField(child=serializers.CharField(), read_only=True)
    demandas = serializers.ListField(child=serializers.CharField(), read_only=True)
    tipos_cq_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    niveis_cq_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    ensaios_cq_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    especs_cq_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    percentuais_cq_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    tipos_material_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_dms_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_bms_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    status_frs_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    acoes_solicitacao_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    responsaveis_material_db = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    # Opções dependentes do cliente (opcionais) - agora usando modelos relacionais
    contratos_cliente = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)
    unidades_cliente = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)
    setores_cliente = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)
    opcoes_espec_cq_cliente = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)
    aprovadores_cliente = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)
    solicitantes_cliente = serializers.ListField(child=serializers.CharField(), read_only=True, required=False)


class OpcoesClienteSerializer(serializers.Serializer):
    """Serializer para retornar opções específicas de um cliente"""
    
    # Usando os novos modelos relacionais - definidos como campos dinâmicos
    contratos = serializers.ListField(child=serializers.CharField(), read_only=True)
    unidades = serializers.ListField(child=serializers.CharField(), read_only=True)
    setores = serializers.ListField(child=serializers.CharField(), read_only=True)
    opcoes_espec_cq = serializers.ListField(child=serializers.CharField(), read_only=True)
    aprovadores = serializers.ListField(child=serializers.CharField(), read_only=True)
    solicitantes = serializers.ListField(child=serializers.CharField(), read_only=True)


class FileUploadSerializer(serializers.Serializer):
    """Serializer para upload de arquivos"""
    
    file = serializers.FileField()
    tipo = serializers.CharField(max_length=50, required=False)
    descricao = serializers.CharField(max_length=200, required=False)
    
    def validate_file(self, value):
        """Valida o arquivo enviado"""
        # Validar tamanho (máximo 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("O arquivo não pode ser maior que 10MB.")
        
        # Validar extensão
        allowed_extensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'dwg']
        file_extension = value.name.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"Extensão de arquivo não permitida. Permitidas: {', '.join(allowed_extensions)}"
            )
        
        return value



# Serializer para Cliente
class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para modelo Cliente"""
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'nome', 
            'hh_valor_fabricacao', 'hh_valor_levantamento', 'hh_valor_servico_pintura_revestimento',
            'hh_valor_montagem', 'hh_valor_inspecao'
        ]
        
    def validate_nome(self, value):
        """Validar nome do cliente"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome do cliente é obrigatório.")
        return value.strip().upper()


# Serializers para os novos modelos relacionais
class ContratoSerializer(serializers.ModelSerializer):
    """Serializer para modelo Contrato"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    
    class Meta:
        model = Contrato
        fields = ['id', 'numero', 'descricao', 'cliente', 'cliente_nome', 'ativo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_numero(self, value):
        """Validar número do contrato"""
        if not value or not value.strip():
            raise serializers.ValidationError("Número do contrato é obrigatório.")
        return value.strip()


class UnidadeClienteSerializer(serializers.ModelSerializer):
    """Serializer para modelo UnidadeCliente"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    
    class Meta:
        model = UnidadeCliente
        fields = ['id', 'nome', 'descricao', 'cliente', 'cliente_nome', 'ativo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nome(self, value):
        """Validar nome da unidade"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome da unidade é obrigatório.")
        return value.strip()


class SetorUnidadeClienteSerializer(serializers.ModelSerializer):
    """Serializer para modelo SetorUnidadeCliente"""
    unidade_nome = serializers.CharField(source='unidade.nome', read_only=True)
    cliente_nome = serializers.CharField(source='unidade.cliente.nome', read_only=True)
    
    class Meta:
        model = SetorUnidadeCliente
        fields = ['id', 'nome', 'descricao', 'unidade', 'unidade_nome', 'cliente_nome', 'ativo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nome(self, value):
        """Validar nome do setor"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome do setor é obrigatório.")
        return value.strip()


class AprovadorClienteSerializer(serializers.ModelSerializer):
    """Serializer para modelo AprovadorCliente"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    
    class Meta:
        model = AprovadorCliente
        fields = ['id', 'nome', 'cargo', 'email', 'cliente', 'cliente_nome', 'ativo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nome(self, value):
        """Validar nome do aprovador"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome do aprovador é obrigatório.")
        return value.strip()


class SolicitanteClienteSerializer(serializers.ModelSerializer):
    """Serializer para modelo SolicitanteCliente"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    
    class Meta:
        model = SolicitanteCliente
        fields = ['id', 'nome', 'cargo', 'email', 'cliente', 'cliente_nome', 'ativo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nome(self, value):
        """Validar nome do solicitante"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome do solicitante é obrigatório.")
        return value.strip()


class OpcaoEspecCQSerializer(serializers.ModelSerializer):
    """Serializer para modelo OpcaoEspecCQ"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    
    class Meta:
        model = OpcaoEspecCQ
        fields = ['id', 'nome', 'descricao', 'cliente', 'cliente_nome', 'ativo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_nome(self, value):
        """Validar nome da opção específica"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome da opção específica é obrigatório.")
        return value.strip()


# Serializers genéricos para modelos simples
class SimpleModelSerializer(serializers.ModelSerializer):
    """Serializer genérico para modelos com campos id e nome"""
    
    class Meta:
        fields = ['id', 'nome']
        # Pode ser usado para qualquer modelo que tenha id e nome


# Serializers simplificados usando SimpleModelSerializer
class AcaoSolicitacaoOptionSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = AcaoSolicitacaoOption
        fields = ['id', 'descricao']  # Usa 'descricao' em vez de 'nome'


class DemandaSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = Demanda


class PercentualCQSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = PercentualCQ
        fields = ['id', 'percentual']  # Usa 'percentual' em vez de 'nome'


class TipoMaterialSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = TipoMaterial


class StatusDMSSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = StatusDMS
        fields = ['id', 'status']  # Usa 'status' em vez de 'nome'


class StatusBMSSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = StatusBMS
        fields = ['id', 'status']  # Usa 'status' em vez de 'nome'


class StatusFRSSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = StatusFRS
        fields = ['id', 'status']  # Usa 'status' em vez de 'nome'


# Serializers específicos mantidos apenas onde necessário
class NomeDiligenciadorOSSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = NomeDiligenciadorOS


class NomeResponsavelExecucaoServicoSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = NomeResponsavelExecucaoServico


class ResponsavelMaterialSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = ResponsavelMaterial


# Serializers para selects dinâmicos de CQ
class TipoCQSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = TipoCQ


class NivelCQSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = NivelCQ


class EnsaioCQSerializer(SimpleModelSerializer):
    class Meta(SimpleModelSerializer.Meta):
        model = EnsaioCQ

