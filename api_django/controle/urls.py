from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from . import views
from . import views

# Router principal
router = DefaultRouter()
router.register(r'ordens-servico', views.RegistroOSViewSet, basename='registroos')
router.register(r'clientes', views.ClienteViewSet, basename='cliente')
router.register(r'contratos', views.ContratoViewSet, basename='contrato')
router.register(r'unidades-cliente', views.UnidadeClienteViewSet, basename='unidadecliente')
router.register(r'setores-unidade-cliente', views.SetorUnidadeClienteViewSet, basename='setorunidadecliente')
router.register(r'aprovadores-cliente', views.AprovadorClienteViewSet, basename='aprovadorcliente')
router.register(r'solicitantes-cliente', views.SolicitanteClienteViewSet, basename='solicitantecliente')
router.register(r'opcoes-espec-cq', views.OpcaoEspecCQViewSet, basename='opcaoespeccq')

# Routers aninhados para objetos relacionados
os_router = routers.NestedDefaultRouter(router, r'ordens-servico', lookup='registro')
os_router.register(r'documentos-solicitacao', views.DocumentoSolicitacaoViewSet, basename='registro-documentos')
os_router.register(r'materiais', views.MaterialViewSet, basename='registro-materiais')
os_router.register(r'levantamentos', views.LevantamentoViewSet, basename='registro-levantamentos')

urlpatterns = [
    # URLs do router principal
    path('', include(router.urls)),
    
    # URLs dos routers aninhados
    path('', include(os_router.urls)),
    
    # Endpoints para dados de clientes
    path('dados-cliente/<str:cliente_nome>/', views.dados_cliente_view, name='dados_cliente'),
    
    # Endpoints para opções dinâmicas
    path('opcoes/', views.opcoes_view, name='opcoes'),
    path('perfil/', views.perfil_view, name='perfil'),
    path('estatisticas/', views.estatisticas_view, name='estatisticas'),
    
    # Endpoint de teste de webhooks
    path('webhooks/teste/', views.webhook_test_view, name='webhook-test'),
    
    path('preview-valores/', views.preview_valores_view, name='preview_valores'),

]

urlpatterns += [
    # Endpoints simplificados para dados dinâmicos
    path('tipos-cq/', views.tipos_cq_view, name='tipos-cq'),
    path('niveis-cq/', views.niveis_cq_view, name='niveis-cq'),
    path('ensaios-cq/', views.ensaios_cq_view, name='ensaios-cq'),
    path('acoes-solicitacao/', views.acoes_solicitacao_view, name='acoes-solicitacao'),
    path('demandas/', views.demandas_view, name='demandas'),
    path('percentuais-cq/', views.percentuais_cq_view, name='percentuais-cq'),
    path('tipos-material/', views.tipos_material_view, name='tipos-material'),
    path('status-dms/', views.status_dms_view, name='status-dms'),
    path('status-bms/', views.status_bms_view, name='status-bms'),
    path('status-frs/', views.status_frs_view, name='status-frs'),
    path('diligenciadores/', views.diligenciadores_view, name='diligenciadores'),
    path('executores/', views.executores_view, name='executores'),
    path('responsaveis-material/', views.responsaveis_material_view, name='responsaveis-material'),
    path('clientes-nomes/', views.clientes_nomes_view, name='clientes-nomes'),
    path('teste-upload/', views.test_file_upload_view, name='teste-upload'),
    
    # Novos endpoints para modelos relacionais
    path('status-os/', views.status_os_view, name='status-os'),
    path('status-os-manual/', views.status_os_manual_view, name='status-os-manual'),
    path('status-os-eletronica/', views.status_os_eletronica_view, name='status-os-eletronica'),
    path('status-levantamento/', views.status_levantamento_view, name='status-levantamento'),
    path('status-producao/', views.status_producao_view, name='status-producao'),
    path('regimes-os/', views.regimes_os_view, name='regimes-os'),
    path('status-material/', views.status_material_view, name='status-material'),
    path('tipos-documento-solicitacao/', views.tipos_documento_solicitacao_view, name='tipos-documento-solicitacao'),
    
    # URLs para gerenciamento de selects
    path('gerenciar-selects/', views.gerenciar_selects_view, name='gerenciar-selects'),
    path('adicionar-item-select/', views.adicionar_item_select_view, name='adicionar-item-select'),
    path('editar-item-select/', views.editar_item_select_view, name='editar-item-select'),
    path('excluir-item-select/', views.excluir_item_select_view, name='excluir-item-select'),
]

