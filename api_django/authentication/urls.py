from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'authentication'

urlpatterns = [
    # Autenticação JWT
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', views.verificar_token, name='token_verify'),
    
    # Perfil do usuário
    path('perfil/', views.perfil, name='perfil'),
    path('perfil/atualizar/', views.perfil_atualizar, name='perfil_atualizar'),
    path('alterar-senha/', views.alterar_senha, name='alterar_senha'),
    
    # Administração de usuários (apenas admins)
    path('usuarios/', views.listar_usuarios, name='listar_usuarios'),
    path('usuarios/criar/', views.criar_usuario, name='criar_usuario'),
    path('grupos/', views.listar_grupos, name='listar_grupos'),
    path('verificar-admin/', views.verificar_admin, name='verificar_admin'),
    
    # Relatórios (apenas admins)
    path('relatorios/registros/', views.relatorios_lista_registros, name='relatorios_lista_registros'),
    path('relatorios/exportar-excel/', views.relatorios_exportar_excel, name='relatorios_exportar_excel'),
    path('relatorios/exportar-pdf/', views.relatorios_exportar_pdf, name='relatorios_exportar_pdf'),
    
    # Configurações (apenas admins)
    path('configuracoes/usuarios/', views.configuracoes_listar_usuarios, name='configuracoes_listar_usuarios'),
    path('configuracoes/alterar-grupo/', views.configuracoes_alterar_grupo_usuario, name='configuracoes_alterar_grupo_usuario'),
    path('configuracoes/ativar-usuario/', views.configuracoes_ativar_usuario, name='configuracoes_ativar_usuario'),
    path('configuracoes/excluir-usuario/', views.configuracoes_excluir_usuario, name='configuracoes_excluir_usuario'),
    
    # Cadastro público
    path('cadastro/', views.cadastro_usuario, name='cadastro_usuario'),
]

