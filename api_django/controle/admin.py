from django.contrib import admin
from .models import (
    Cliente, Contrato, UnidadeCliente, SetorUnidadeCliente, AprovadorCliente, SolicitanteCliente, OpcaoEspecCQ,
    TipoCQ, EspecCQ, NivelCQ, EnsaioCQ,
    AcaoSolicitacaoOption, Demanda, PercentualCQ, TipoMaterial, StatusDMS, StatusBMS, StatusFRS,
    NomeDiligenciadorOS, NomeResponsavelExecucaoServico, ResponsavelMaterial, RegistroOS,
    DocumentoSolicitacao, DataPrevistaEntrega, AcaoSolicitacao, ControleQualidade,
    DocumentoEntrada, Levantamento, Material, Gmi, Gme, Rtip, Rtm, Dms, Bms, Frs,
    NfSaida, NfVenda, OrdemCliente, StatusOS, StatusOSManual, StatusOSEletronica, 
    StatusLevantamento, StatusProducao, StatusMaterial, TipoDocumentoSolicitacao,
    RegimeOS
)

# Inlines para os modelos relacionais do Cliente
class ContratoInline(admin.TabularInline):
    model = Contrato
    extra = 1
    fields = ('numero', 'ativo')
    ordering = ('numero',)

class UnidadeClienteInline(admin.TabularInline):
    model = UnidadeCliente
    extra = 1
    fields = ('nome', 'ativo')
    ordering = ('nome',)

class AprovadorClienteInline(admin.TabularInline):
    model = AprovadorCliente
    extra = 1
    fields = ('nome', 'ativo')
    ordering = ('nome',)

class SolicitanteClienteInline(admin.TabularInline):
    model = SolicitanteCliente
    extra = 1
    fields = ('nome', 'ativo')
    ordering = ('nome',)

class OpcaoEspecCQInline(admin.TabularInline):
    model = OpcaoEspecCQ
    extra = 1
    fields = ('nome', 'ativo')
    ordering = ('nome',)

# Inlines para os modelos relacionados à OS
class DocumentoSolicitacaoInline(admin.TabularInline):
    model = DocumentoSolicitacao
    extra = 1
    fields = ('tipo_documento_solicitacao', 'documento_solicitacao')
    ordering = ('tipo_documento_solicitacao',)

class DataPrevistaEntregaInline(admin.TabularInline):
    model = DataPrevistaEntrega
    extra = 1
    fields = ('data_prevista_entrega', 'descricao')
    ordering = ('data_prevista_entrega',)

class AcaoSolicitacaoInline(admin.TabularInline):
    model = AcaoSolicitacao
    extra = 1
    fields = ('acao_solicitacao',)
    ordering = ('acao_solicitacao',)

class ControleQualidadeInline(admin.TabularInline):
    model = ControleQualidade
    extra = 1
    fields = ('tipo_cq', 'opcoes_espec_cq', 'nivel_inspecao_cq', 'tipo_ensaio_cq', 'percentual_cq', 'quantidade_cq', 'tamanho_cq', 'texto_tamanho_cq')
    ordering = ('tipo_cq',)

class DocumentoEntradaInline(admin.TabularInline):
    model = DocumentoEntrada
    extra = 1
    fields = ('documento_entrada', 'numero_documento_entrada', 'data_documento_entrada')
    ordering = ('data_documento_entrada',)

class LevantamentoInline(admin.TabularInline):
    model = Levantamento
    extra = 1
    fields = ('data_levantamento', 'descricao_levantamento', 'arquivo_anexo_levantamento')
    ordering = ('data_levantamento',)

class MaterialInline(admin.TabularInline):
    model = Material
    extra = 1
    fields = ('tipo_material', 'status_material', 'responsavel_material')
    ordering = ('tipo_material',)

class GmiInline(admin.TabularInline):
    model = Gmi
    extra = 1
    fields = ('data_gmi', 'descricao_gmi', 'arquivo_anexo_gmi')
    ordering = ('data_gmi',)

class GmeInline(admin.TabularInline):
    model = Gme
    extra = 1
    fields = ('data_gme', 'descricao_gme', 'arquivo_anexo_gme')
    ordering = ('data_gme',)

class RtipInline(admin.TabularInline):
    model = Rtip
    extra = 1
    fields = ('data_rtip', 'descricao_rtip', 'arquivo_anexo_rtip')
    ordering = ('data_rtip',)

class RtmInline(admin.TabularInline):
    model = Rtm
    extra = 1
    fields = ('data_rtm', 'descricao_rtm', 'arquivo_anexo_rtm')
    ordering = ('data_rtm',)

class DmsInline(admin.TabularInline):
    model = Dms
    extra = 1
    fields = ('status_dms', 'numero_dms', 'data_aprovacao_dms')
    ordering = ('data_aprovacao_dms',)

class BmsInline(admin.TabularInline):
    model = Bms
    extra = 1
    fields = ('status_bms', 'numero_bms', 'data_aprovacao_bms')
    ordering = ('data_aprovacao_bms',)

class FrsInline(admin.TabularInline):
    model = Frs
    extra = 1
    fields = ('status_frs', 'numero_frs', 'data_aprovacao_frs')
    ordering = ('data_aprovacao_frs',)

class NfSaidaInline(admin.TabularInline):
    model = NfSaida
    extra = 1
    fields = ('numero_nota_fiscal_remessa_saida', 'arquivo_anexo_nota_fiscal_remessa_saida', 'data_nota_fiscal_remessa_saida')
    ordering = ('data_nota_fiscal_remessa_saida',)

class NfVendaInline(admin.TabularInline):
    model = NfVenda
    extra = 1
    fields = ('numero_nota_fiscal_venda', 'preco_nota_fiscal_venda', 'arquivo_anexo_nota_fiscal_venda', 'data_nota_fiscal_venda')
    ordering = ('data_nota_fiscal_venda',)

class OrdemClienteInline(admin.TabularInline):
    model = OrdemCliente
    extra = 1
    fields = ('numero_ordem', 'descricao')
    ordering = ('numero_ordem',)

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nome',)
    search_fields = ('nome',)
    fieldsets = (
        ('Identificação', {'fields': ('nome',)}),
        ('HH por Serviço', {'fields': (
            'hh_valor_fabricacao', 'hh_valor_levantamento', 'hh_valor_servico_pintura_revestimento', 'hh_valor_montagem', 'hh_valor_inspecao'
        )}),
    )
    inlines = [
        ContratoInline,
        UnidadeClienteInline,
        AprovadorClienteInline,
        SolicitanteClienteInline,
        OpcaoEspecCQInline,
    ]

# Admin para os novos modelos relacionais
@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ('numero', 'cliente', 'ativo', 'created_at')
    list_filter = ('ativo', 'cliente', 'created_at')
    search_fields = ('numero', 'cliente__nome')
    ordering = ('cliente__nome', 'numero')
    fields = ('cliente', 'numero', 'descricao', 'ativo')

class SetorUnidadeClienteInline(admin.TabularInline):
    model = SetorUnidadeCliente
    extra = 1
    fields = ('nome', 'descricao', 'ativo')
    ordering = ('nome',)

@admin.register(UnidadeCliente)
class UnidadeClienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cliente', 'ativo', 'created_at')
    list_filter = ('ativo', 'cliente', 'created_at')
    search_fields = ('nome', 'cliente__nome')
    ordering = ('cliente__nome', 'nome')
    fields = ('cliente', 'nome', 'descricao', 'ativo')
    inlines = [SetorUnidadeClienteInline]

@admin.register(SetorUnidadeCliente)
class SetorUnidadeClienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'unidade', 'cliente', 'ativo', 'created_at')
    list_filter = ('ativo', 'unidade__cliente', 'created_at')
    search_fields = ('nome', 'unidade__nome', 'unidade__cliente__nome')
    ordering = ('unidade__cliente__nome', 'unidade__nome', 'nome')
    fields = ('unidade', 'nome', 'descricao', 'ativo')

    def cliente(self, obj):
        return obj.unidade.cliente.nome
    cliente.short_description = 'Cliente'

@admin.register(AprovadorCliente)
class AprovadorClienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cliente', 'cargo', 'email', 'ativo', 'created_at')
    list_filter = ('ativo', 'cliente', 'created_at')
    search_fields = ('nome', 'cliente__nome', 'cargo', 'email')
    ordering = ('cliente__nome', 'nome')
    fields = ('cliente', 'nome', 'cargo', 'email', 'ativo')

@admin.register(SolicitanteCliente)
class SolicitanteClienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cliente', 'cargo', 'email', 'ativo', 'created_at')
    list_filter = ('ativo', 'cliente', 'created_at')
    search_fields = ('nome', 'cliente__nome', 'cargo', 'email')
    ordering = ('cliente__nome', 'nome')
    fields = ('cliente', 'nome', 'cargo', 'email', 'ativo')

@admin.register(OpcaoEspecCQ)
class OpcaoEspecCQAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cliente', 'ativo', 'created_at')
    list_filter = ('ativo', 'cliente', 'created_at')
    search_fields = ('nome', 'cliente__nome')
    ordering = ('cliente__nome', 'nome')
    fields = ('cliente', 'nome', 'descricao', 'ativo')

# Registro dos modelos de opções
admin.site.register(TipoCQ)
admin.site.register(NivelCQ)
admin.site.register(EnsaioCQ)
admin.site.register(AcaoSolicitacaoOption)
admin.site.register(Demanda)
admin.site.register(PercentualCQ)
admin.site.register(TipoMaterial)
admin.site.register(StatusDMS)
admin.site.register(StatusBMS)
admin.site.register(StatusFRS)
admin.site.register(NomeDiligenciadorOS)
admin.site.register(NomeResponsavelExecucaoServico)
admin.site.register(ResponsavelMaterial)
admin.site.register(StatusOS)
admin.site.register(StatusOSManual)
admin.site.register(StatusOSEletronica)
admin.site.register(StatusLevantamento)
admin.site.register(StatusProducao)
admin.site.register(StatusMaterial)
admin.site.register(TipoDocumentoSolicitacao)
admin.site.register(RegimeOS)


@admin.register(RegistroOS)
class RegistroOSAdmin(admin.ModelAdmin):
    list_display = ("numero_os", "nome_cliente", "status_os", "created_at", "usuario")
    search_fields = ("numero_os", "nome_cliente__nome", "status_os")
    list_filter = ("status_os", "created_at", "nome_cliente")
    ordering = ("-created_at",)
    
    # Configuração dos campos para exibição no formulário
    fieldsets = (
        ('Informações Básicas', {
            'fields': (
                'numero_os', 'data_solicitacao_os', 'data_emissao_os', 'nome_cliente', 
                'numero_contrato', 'unidade_cliente', 'setor_unidade_cliente',
                'prazo_execucao_servico', 'status_regime_os'
            )
        }),
        ('Responsáveis', {
            'fields': (
                'nome_diligenciador_os', 'nome_solicitante_cliente', 
                'nome_responsavel_aprovacao_os_cliente', 'nome_responsavel_execucao_servico',
                'id_demanda'
            )
        }),
        ('Descrições', {
            'fields': (
                'descricao_resumida', 'descricao_detalhada', 'existe_orcamento'
            )
        }),
        ('Medições', {
            'fields': (
                'peso_fabricacao', 'metro_quadrado_pintura_revestimento'
            )
        }),
        ('Valores Financeiros', {
            'fields': (
                ('valor_fabricacao', 'havera_valor_fabricacao'),
                ('valor_levantamento', 'havera_valor_levantamento'),
                ('valor_material_fabricacao', 'havera_valor_material_fabricacao'),
                ('valor_material_pintura', 'havera_valor_material_pintura'),
                ('valor_servico_pintura_revestimento', 'havera_valor_servico_pintura_revestimento'),
                ('valor_montagem', 'havera_valor_montagem'),
                ('valor_material_montagem', 'havera_valor_material_montagem'),
                ('valor_inspecao', 'havera_valor_inspecao'),
                ('valor_hh', 'havera_valor_hh'),
                ('valor_manutencao_valvula', 'havera_valor_manutencao_valvula'),
                ('valor_servico_terceiros', 'havera_valor_servico_terceiros'),
                'soma_valores', 'hh_previsao'
            )
        }),
        ('Status', {
            'fields': (
                'status_os', 'status_os_manual', 'status_os_eletronica',
                'data_aprovacao_assinatura_manual', 'data_assinatura_eletronica_os',
                'numero_os_eletronica', 'status_levantamento', 'status_producao'
            )
        }),
        ('Controle de Documentos', {
            'fields': (
                'opcoes_dms', 'opcoes_bms', 'opcoes_frs', 'opcoes_nf',
                'soma_notas_fiscais', 'saldo_final'
            )
        }),
        ('Observações e Controle', {
            'fields': (
                'observacao', 'usuario', 'os_id'
            )
        }),
    )
    
    # Todos os inlines relacionados à OS
    inlines = [
        DocumentoSolicitacaoInline,
        DataPrevistaEntregaInline,
        AcaoSolicitacaoInline,
        ControleQualidadeInline,
        DocumentoEntradaInline,
        LevantamentoInline,
        MaterialInline,
        GmiInline,
        GmeInline,
        RtipInline,
        RtmInline,
        DmsInline,
        BmsInline,
        FrsInline,
        NfSaidaInline,
        NfVendaInline,
        OrdemClienteInline,
    ]
    
    readonly_fields = ('numero_os', 'soma_valores', 'soma_notas_fiscais', 'saldo_final', 'os_id', 'created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'nome_cliente', 'numero_contrato', 'unidade_cliente', 'setor_unidade_cliente',
            'nome_diligenciador_os', 'nome_solicitante_cliente', 'nome_responsavel_aprovacao_os_cliente',
            'nome_responsavel_execucao_servico', 'id_demanda', 'usuario'
        )

