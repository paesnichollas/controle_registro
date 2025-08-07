from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
import uuid
import random


def default_prazo_execucao():
    return datetime.now() + timedelta(days=30)


class RegistroOS(models.Model):
    # Choices para campos de seleção (apenas campos booleanos/SIM-NÃO)
    OPCOES_SIM_NAO = [
        ('', 'Selecione'), ('SIM', 'Sim'), ('NAO', 'Não'),
    ]
    OPCOES_VALOR = OPCOES_SIM_NAO
    OPCOES_DMS = OPCOES_SIM_NAO
    OPCOES_BMS = OPCOES_SIM_NAO
    OPCOES_FRS = OPCOES_SIM_NAO
    OPCOES_NOTAS_FISCAIS = OPCOES_SIM_NAO
    OPCOES_ORCAMENTO = OPCOES_SIM_NAO
    # Campos principais
    numero_os = models.PositiveIntegerField(unique=True, editable=False)
    data_solicitacao_os = models.DateTimeField(default=datetime.now, null=True, blank=True)
    data_emissao_os = models.DateTimeField(default=datetime.now, null=True, blank=True)
    nome_cliente = models.ForeignKey('Cliente', on_delete=models.SET_NULL, null=True, blank=True)
    numero_contrato = models.ForeignKey('Contrato', on_delete=models.SET_NULL, null=True, blank=True)
    unidade_cliente = models.ForeignKey('UnidadeCliente', on_delete=models.SET_NULL, null=True, blank=True)
    setor_unidade_cliente = models.ForeignKey('SetorUnidadeCliente', on_delete=models.SET_NULL, null=True, blank=True)
    prazo_execucao_servico = models.DateTimeField(default=default_prazo_execucao, null=True, blank=True)
    status_regime_os = models.ForeignKey('RegimeOS', on_delete=models.SET_NULL, null=True, blank=True)
    nome_diligenciador_os = models.ForeignKey('NomeDiligenciadorOS', on_delete=models.SET_NULL, null=True, blank=True)
    nome_solicitante_cliente = models.ForeignKey('SolicitanteCliente', on_delete=models.SET_NULL, null=True, blank=True)
    nome_responsavel_aprovacao_os_cliente = models.ForeignKey('AprovadorCliente', on_delete=models.SET_NULL, null=True, blank=True)
    nome_responsavel_execucao_servico = models.ForeignKey('NomeResponsavelExecucaoServico', on_delete=models.SET_NULL, null=True, blank=True)
    id_demanda = models.ForeignKey('Demanda', on_delete=models.SET_NULL, null=True, blank=True)
    descricao_resumida = models.TextField(max_length=500, default='', null=True, blank=True)
    descricao_detalhada = models.TextField(max_length=2000, blank=True, default='', null=True)
    existe_orcamento = models.CharField(max_length=100, choices=OPCOES_ORCAMENTO, default='', null=True, blank=True)
    
    # Campos de medição
    peso_fabricacao = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    metro_quadrado_pintura_revestimento = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    
    # Campos de valores financeiros
    valor_fabricacao = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_fabricacao = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)
    valor_levantamento = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_levantamento = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True) 
    valor_material_fabricacao = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_material_fabricacao = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)  
    valor_material_pintura = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_material_pintura = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)   
    valor_servico_pintura_revestimento = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_servico_pintura_revestimento = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)    
    valor_montagem = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_montagem = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)    
    valor_material_montagem = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_material_montagem = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)    
    valor_inspecao = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_inspecao = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)    
    valor_hh = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_hh = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)    
    valor_manutencao_valvula = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_manutencao_valvula = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)    
    valor_servico_terceiros = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    havera_valor_servico_terceiros = models.CharField(max_length=100, choices=OPCOES_VALOR, default='', null=True, blank=True)
    
    # Campos calculados
    soma_valores = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False, null=True, blank=True)
    hh_previsao = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    
    # Campos de status
    status_os = models.ForeignKey('StatusOS', on_delete=models.SET_NULL, null=True, blank=True)
    status_os_manual = models.ForeignKey('StatusOSManual', on_delete=models.SET_NULL, null=True, blank=True)    
    status_os_eletronica = models.ForeignKey('StatusOSEletronica', on_delete=models.SET_NULL, null=True, blank=True)    
    data_aprovacao_assinatura_manual = models.DateTimeField(null=True, blank=True)
    data_assinatura_eletronica_os = models.DateTimeField(null=True, blank=True)
    numero_os_eletronica = models.IntegerField(null=True, blank=True)
    status_levantamento = models.ForeignKey('StatusLevantamento', on_delete=models.SET_NULL, null=True, blank=True)
    status_producao = models.ForeignKey('StatusProducao', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Campos de controle de documentos
    opcoes_dms = models.CharField(max_length=100, choices=OPCOES_DMS, default='', null=True, blank=True)  
    opcoes_bms = models.CharField(max_length=100, choices=OPCOES_BMS, default='', null=True, blank=True)
    opcoes_frs = models.CharField(max_length=100, choices=OPCOES_FRS, default='', null=True, blank=True)  
    opcoes_nf = models.CharField(max_length=100, choices=OPCOES_NOTAS_FISCAIS, default='', null=True, blank=True)      
    soma_notas_fiscais = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False, null=True, blank=True)
    saldo_final = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False, null=True, blank=True)
    
    # Campos de controle
    observacao = models.TextField(max_length=1000, blank=True, null=True, default='')
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="ordens_servico")
    os_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
    
    def __str__(self):
        return f"OS {self.numero_os} - {self.nome_cliente}"
    
    def save(self, *args, **kwargs):
        if not self.numero_os:
            self.numero_os = self.gerar_numero_os()
        
        # Calcular soma de valores
        self.calcular_soma_valores()
        
        super().save(*args, **kwargs)
        
    def gerar_numero_os(self):
        """Gera um número único para a OS"""
        while True:
            numero = random.randint(100000, 999999)
            if not RegistroOS.objects.filter(numero_os=numero).exists():
                return numero
    
    def calcular_soma_valores(self):
        """Calcula a soma dos valores baseado nos campos 'havera_valor'"""
        total = 0
        
        campos_valor = [
            ('havera_valor_fabricacao', 'valor_fabricacao'),
            ('havera_valor_levantamento', 'valor_levantamento'),
            ('havera_valor_material_fabricacao', 'valor_material_fabricacao'),
            ('havera_valor_material_pintura', 'valor_material_pintura'),
            ('havera_valor_servico_pintura_revestimento', 'valor_servico_pintura_revestimento'),
            ('havera_valor_montagem', 'valor_montagem'),
            ('havera_valor_material_montagem', 'valor_material_montagem'),
            ('havera_valor_inspecao', 'valor_inspecao'),
            ('havera_valor_hh', 'valor_hh'),
            ('havera_valor_manutencao_valvula', 'valor_manutencao_valvula'),
            ('havera_valor_servico_terceiros', 'valor_servico_terceiros'),
        ]
        
        for campo_havera, campo_valor in campos_valor:
            if getattr(self, campo_havera) == 'SIM':
                total += getattr(self, campo_valor, 0) or 0
        
        self.soma_valores = total
    
    def calcular_soma_notas_fiscais(self):
        """Calcula a soma das notas fiscais de venda"""
        total = sum(nf.preco_nota_fiscal_venda for nf in self.notas_fiscais_venda.all())
        self.soma_notas_fiscais = total
        return total
    
    def calcular_saldo_final(self):
        """Calcula o saldo final (soma_notas_fiscais - soma_valores)"""
        from decimal import Decimal
        
        self.calcular_soma_notas_fiscais()
        
        # Converter para Decimal para evitar erro de tipo
        soma_valores = Decimal(str(self.soma_valores or 0))
        soma_notas_fiscais = Decimal(str(self.soma_notas_fiscais or 0))
        
        self.saldo_final = soma_notas_fiscais - soma_valores
        return self.saldo_final


class DocumentoSolicitacao(models.Model):
    """Documentos de solicitação da OS"""
    
    # Tipo de documento de solicitação agora usa modelo relacional
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='documentos_solicitacao')
    tipo_documento_solicitacao = models.ForeignKey('TipoDocumentoSolicitacao', on_delete=models.SET_NULL, null=True, blank=True)
    documento_solicitacao = models.FileField(
        upload_to='documentos_solicitacao/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Documento de Solicitação'
        verbose_name_plural = 'Documentos de Solicitação'
    
    def __str__(self):
        return f"Documento {self.tipo_documento_solicitacao} - OS {self.registro.numero_os}"


class DataPrevistaEntrega(models.Model):
    """Datas previstas de entrega"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='datas_previstas')
    data_prevista_entrega = models.DateTimeField()
    descricao = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Data Prevista de Entrega'
        verbose_name_plural = 'Datas Previstas de Entrega'
    
    def __str__(self):
        return f"Entrega {self.data_prevista_entrega.strftime('%d/%m/%Y')} - OS {self.registro.numero_os}"


class AcaoSolicitacao(models.Model):
    """Ações a serem realizadas conforme solicitação"""
    
    # Ação de solicitação agora usa modelo relacional
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='acoes_solicitacao')
    acao_solicitacao = models.ForeignKey('AcaoSolicitacaoOption', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Ação de Solicitação'
        verbose_name_plural = 'Ações de Solicitação'
    
    def __str__(self):
        return f"Ação {self.acao_solicitacao} - OS {self.registro.numero_os}"


class ControleQualidade(models.Model):
    """Controle de qualidade e especificações técnicas"""
    
    # Controle de qualidade agora usa modelos relacionais
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='controles_qualidade')
    tipo_cq = models.ForeignKey('TipoCQ', on_delete=models.SET_NULL, null=True, blank=True)
    opcoes_espec_cq = models.ForeignKey('OpcaoEspecCQ', on_delete=models.SET_NULL, null=True, blank=True)
    nivel_inspecao_cq = models.ForeignKey('NivelCQ', on_delete=models.SET_NULL, null=True, blank=True)
    tipo_ensaio_cq = models.ForeignKey('EnsaioCQ', on_delete=models.SET_NULL, null=True, blank=True)
    percentual_cq = models.ForeignKey('PercentualCQ', on_delete=models.SET_NULL, null=True, blank=True)
    quantidade_cq = models.IntegerField(default=0)
    tamanho_cq = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    texto_tamanho_cq = models.CharField(max_length=100, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Controle de Qualidade'
        verbose_name_plural = 'Controles de Qualidade'
    
    def __str__(self):
        return f"CQ {self.tipo_cq} - OS {self.registro.numero_os}"


class OrdemCliente(models.Model):
    """Números de ordem fornecidos pelo cliente"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='ordens_cliente')
    numero_ordem = models.CharField(max_length=100)
    descricao = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Ordem do Cliente'
        verbose_name_plural = 'Ordens do Cliente'
    
    def __str__(self):
        return f"Ordem {self.numero_ordem} - OS {self.registro.numero_os}"


class DocumentoEntrada(models.Model):
    """Documentos de entrada"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='documentos_entrada')
    documento_entrada = models.FileField(
        upload_to='documentos_entrada/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])]
    )
    numero_documento_entrada = models.CharField(max_length=100)
    data_documento_entrada = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Documento de Entrada'
        verbose_name_plural = 'Documentos de Entrada'
    
    def __str__(self):
        return f"Doc. Entrada {self.numero_documento_entrada} - OS {self.registro.numero_os}"


class Levantamento(models.Model):
    """Informações de levantamento técnico"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='levantamentos')
    data_levantamento = models.DateTimeField()
    descricao_levantamento = models.TextField(max_length=500)
    arquivo_anexo_levantamento = models.FileField(
        upload_to="anexos_levantamento/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'dwg'])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Levantamento'
        verbose_name_plural = 'Levantamentos'
    
    def __str__(self):
        return f"Levantamento {self.data_levantamento.strftime('%d/%m/%Y')} - OS {self.registro.numero_os}"


class Material(models.Model):
    """Controle de materiais"""
    
    # Tipo de material agora usa modelo relacional
    
    # Status de material agora usa modelo relacional
    
    # Responsável por material agora usa modelo relacional
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='materiais')
    tipo_material = models.ForeignKey('TipoMaterial', on_delete=models.SET_NULL, null=True, blank=True)
    status_material = models.ForeignKey('StatusMaterial', on_delete=models.SET_NULL, null=True, blank=True)
    responsavel_material = models.ForeignKey('ResponsavelMaterial', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Material'
        verbose_name_plural = 'Materiais'
    
    def __str__(self):
        return f"Material {self.tipo_material} - OS {self.registro.numero_os}"


# Continuação dos modelos relacionados...
class Gmi(models.Model):
    """Guia de Movimentação Interna"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='gmis')
    data_gmi = models.DateTimeField()
    descricao_gmi = models.TextField(max_length=400)
    arquivo_anexo_gmi = models.FileField(
        upload_to="anexos_gmi/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'GMI - Guia de Movimentação Interna'
        verbose_name_plural = 'GMIs - Guias de Movimentação Interna'
    
    def __str__(self):
        return f"GMI {self.data_gmi.strftime('%d/%m/%Y')} - OS {self.registro.numero_os}"


class Gme(models.Model):
    """Guia de Movimentação Externa"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='gmes')
    data_gme = models.DateTimeField()
    descricao_gme = models.TextField(max_length=400)
    arquivo_anexo_gme = models.FileField(
        upload_to="anexos_gme/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'GME - Guia de Movimentação Externa'
        verbose_name_plural = 'GMEs - Guias de Movimentação Externa'
    
    def __str__(self):
        return f"GME {self.data_gme.strftime('%d/%m/%Y')} - OS {self.registro.numero_os}"


class Rtip(models.Model):
    """Relatório Técnico de Inspeção de Pintura"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='rtips')
    data_rtip = models.DateTimeField()
    descricao_rtip = models.TextField(max_length=400)
    arquivo_anexo_rtip = models.FileField(
        upload_to="anexos_rtip/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'RTIP - Relatório Técnico de Inspeção de Pintura'
        verbose_name_plural = 'RTIPs - Relatórios Técnicos de Inspeção de Pintura'
    
    def __str__(self):
        return f"RTIP {self.data_rtip.strftime('%d/%m/%Y')} - OS {self.registro.numero_os}"


class Rtm(models.Model):
    """Relatório Técnico de Manutenção/Montagem"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='rtms')
    data_rtm = models.DateTimeField()
    descricao_rtm = models.TextField(max_length=400)
    arquivo_anexo_rtm = models.FileField(
        upload_to="anexos_rtm/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'RTM - Relatório Técnico de Manutenção/Montagem'
        verbose_name_plural = 'RTMs - Relatórios Técnicos de Manutenção/Montagem'
    
    def __str__(self):
        return f"RTM {self.data_rtm.strftime('%d/%m/%Y')} - OS {self.registro.numero_os}"


class Dms(models.Model):
    """Demonstrativo de Medição do Serviço"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='dms')
    status_dms = models.ForeignKey('StatusDMS', on_delete=models.SET_NULL, null=True, blank=True)
    numero_dms = models.CharField(max_length=100)
    data_aprovacao_dms = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'DMS - Demonstrativo de Medição do Serviço'
        verbose_name_plural = 'DMS - Demonstrativos de Medição do Serviço'
    
    def __str__(self):
        return f"DMS {self.numero_dms} - OS {self.registro.numero_os}"


class Bms(models.Model):
    """Boletim de Medição do Serviço"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='bms')
    status_bms = models.ForeignKey('StatusBMS', on_delete=models.SET_NULL, null=True, blank=True)
    numero_bms = models.CharField(max_length=100)
    data_aprovacao_bms = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'BMS - Boletim de Medição do Serviço'
        verbose_name_plural = 'BMS - Boletins de Medição do Serviço'
    
    def __str__(self):
        return f"BMS {self.numero_bms} - OS {self.registro.numero_os}"


class Frs(models.Model):
    """Folha de Registro do Serviço"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='frs')
    status_frs = models.ForeignKey('StatusFRS', on_delete=models.SET_NULL, null=True, blank=True)
    numero_frs = models.CharField(max_length=100)
    data_aprovacao_frs = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'FRS - Folha de Registro do Serviço'
        verbose_name_plural = 'FRS - Folhas de Registro do Serviço'
    
    def __str__(self):
        return f"FRS {self.numero_frs} - OS {self.registro.numero_os}"


class NfSaida(models.Model):
    """Nota Fiscal de Remessa (Saída)"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='notas_fiscais_saida')
    numero_nota_fiscal_remessa_saida = models.CharField(max_length=100)
    arquivo_anexo_nota_fiscal_remessa_saida = models.FileField(
        upload_to="anexos_nfsaida/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )
    data_nota_fiscal_remessa_saida = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Nota Fiscal de Saída'
        verbose_name_plural = 'Notas Fiscais de Saída'
    
    def __str__(self):
        return f"NF Saída {self.numero_nota_fiscal_remessa_saida} - OS {self.registro.numero_os}"


class NfVenda(models.Model):
    """Nota Fiscal de Venda"""
    
    registro = models.ForeignKey(RegistroOS, on_delete=models.CASCADE, related_name='notas_fiscais_venda')
    numero_nota_fiscal_venda = models.CharField(max_length=100)
    preco_nota_fiscal_venda = models.DecimalField(max_digits=15, decimal_places=2)
    arquivo_anexo_nota_fiscal_venda = models.FileField(
        upload_to="anexos_nfvenda/",
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )
    data_nota_fiscal_venda = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Nota Fiscal de Venda'
        verbose_name_plural = 'Notas Fiscais de Venda'
    
    def __str__(self):
        return f"NF Venda {self.numero_nota_fiscal_venda} - OS {self.registro.numero_os}"

class Cliente(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    # HH por tipo de serviço
    hh_valor_fabricacao = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hh_valor_levantamento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hh_valor_servico_pintura_revestimento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hh_valor_montagem = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hh_valor_inspecao = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # hh_valor_hh = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # CAMPO DESATIVADO TEMPORARIAMENTE

    def __str__(self):
        return self.nome.upper()


# Novos modelos relacionais para substituir os JSONFields
class Contrato(models.Model):
    """Modelo para contratos do cliente"""
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contratos_relacionados')
    numero = models.CharField(max_length=100)
    descricao = models.CharField(max_length=200, blank=True, null=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['cliente', 'numero']
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'

    def __str__(self):
        return f"{self.numero} - {self.cliente.nome}"


class UnidadeCliente(models.Model):
    """Modelo para unidades do cliente"""
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='unidades_relacionadas')
    nome = models.CharField(max_length=100)
    descricao = models.CharField(max_length=200, blank=True, null=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['cliente', 'nome']
        verbose_name = 'Unidade do Cliente'
        verbose_name_plural = 'Unidades do Cliente'

    def __str__(self):
        return f"{self.nome} - {self.cliente.nome}"


class SetorUnidadeCliente(models.Model):
    """Modelo para setores das unidades do cliente"""
    unidade = models.ForeignKey(UnidadeCliente, on_delete=models.CASCADE, related_name='setores')
    nome = models.CharField(max_length=100)
    descricao = models.CharField(max_length=200, blank=True, null=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['unidade', 'nome']
        verbose_name = 'Setor da Unidade'
        verbose_name_plural = 'Setores das Unidades'

    def __str__(self):
        return f"{self.nome} - {self.unidade.nome}"


class AprovadorCliente(models.Model):
    """Modelo para aprovadores do cliente"""
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='aprovadores_relacionados')
    nome = models.CharField(max_length=100)
    cargo = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['cliente', 'nome']
        verbose_name = 'Aprovador do Cliente'
        verbose_name_plural = 'Aprovadores do Cliente'

    def __str__(self):
        return f"{self.nome} - {self.cliente.nome}"


class SolicitanteCliente(models.Model):
    """Modelo para solicitantes do cliente"""
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='solicitantes_relacionados')
    nome = models.CharField(max_length=100)
    cargo = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['cliente', 'nome']
        verbose_name = 'Solicitante do Cliente'
        verbose_name_plural = 'Solicitantes do Cliente'

    def __str__(self):
        return f"{self.nome} - {self.cliente.nome}"


class OpcaoEspecCQ(models.Model):
    """Modelo para opções específicas de CQ do cliente"""
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='opcoes_espec_cq')
    nome = models.CharField(max_length=100)
    descricao = models.CharField(max_length=200, blank=True, null=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['cliente', 'nome']
        verbose_name = 'Opção Específica CQ'
        verbose_name_plural = 'Opções Espec CQ'

    def __str__(self):
        return f"{self.nome} - {self.cliente.nome}"


class TipoCQ(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.nome

class EspecCQ(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.nome

class NivelCQ(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.nome

class EnsaioCQ(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.nome

class AcaoSolicitacaoOption(models.Model):
    descricao = models.CharField(max_length=200, unique=True)
    def __str__(self):
        return self.descricao

class Demanda(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.nome

class PercentualCQ(models.Model):
    percentual = models.CharField(max_length=10, unique=True)
    def __str__(self):
        return self.percentual

class TipoMaterial(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.nome

class StatusDMS(models.Model):
    status = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.status

class StatusBMS(models.Model):
    status = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.status

class StatusFRS(models.Model):
    status = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.status

class NomeDiligenciadorOS(models.Model):
    nome = models.CharField(max_length=100)

    def __str__(self):
        return self.nome

class NomeResponsavelExecucaoServico(models.Model):
    nome = models.CharField(max_length=100)
    def __str__(self):
        return self.nome

class ResponsavelMaterial(models.Model):
    nome = models.CharField(max_length=100)
    def __str__(self):
        return self.nome

# Novos modelos relacionais para substituir choices hardcoded
class RegimeOS(models.Model):
    """Modelo para regimes de OS"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Regime de OS'
        verbose_name_plural = 'Regimes de OS'


class StatusOS(models.Model):
    """Modelo para status de OS"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Status de OS'
        verbose_name_plural = 'Status de OS'


class StatusOSManual(models.Model):
    """Modelo para status de OS manual"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Status de OS Manual'
        verbose_name_plural = 'Status de OS Manual'


class StatusOSEletronica(models.Model):
    """Modelo para status de OS eletrônica"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Status de OS Eletrônica'
        verbose_name_plural = 'Status de OS Eletrônica'


class StatusLevantamento(models.Model):
    """Modelo para status de levantamento"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Status de Levantamento'
        verbose_name_plural = 'Status de Levantamento'


class StatusProducao(models.Model):
    """Modelo para status de produção"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Status de Produção'
        verbose_name_plural = 'Status de Produção'


class StatusMaterial(models.Model):
    """Modelo para status de material"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Status de Material'
        verbose_name_plural = 'Status de Material'


class TipoDocumentoSolicitacao(models.Model):
    """Modelo para tipos de documento de solicitação"""
    nome = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = 'Tipo de Documento de Solicitação'
        verbose_name_plural = 'Tipos de Documento de Solicitação'
