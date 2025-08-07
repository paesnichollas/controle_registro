from rest_framework import permissions


class RegistroOSPermission(permissions.BasePermission):
    """
    Permissões customizadas para Ordem de Serviço baseadas nos grupos de usuário
    """
    
    def has_permission(self, request, view):
        """Verifica se o usuário tem permissão para acessar a view"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Todos os usuários autenticados podem listar e criar OS
        if view.action in ['list', 'create']:
            return True
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """Verifica permissões específicas do objeto"""
        user = request.user
        user_groups = [group.name for group in user.groups.all()]
        
        # Administradores têm acesso total
        if 'Administrador' in user_groups:
            return True
        
        # Superiores, Qualidade e Técnicos podem visualizar e editar todas as OS
        if any(group in user_groups for group in ["Superior", "Qualidade", "Tecnico"]):
            if view.action == 'destroy':
                return False  # Apenas administradores podem deletar
            return True
        
        # Usuários do grupo Básico e usuários sem grupo específico
        # só podem acessar suas próprias OS
        if view.action in permissions.SAFE_METHODS:
            # Leitura: apenas suas próprias OS
            return obj.usuario == user
        elif view.action in ['update', 'partial_update']:
            # Edição: apenas suas próprias OS
            return obj.usuario == user
        elif view.action == 'destroy':
            # Exclusão: negado para todos exceto administradores
            return False
        
        # Se não está em nenhum grupo conhecido, negar acesso
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada para permitir apenas aos donos editar seus objetos
    """
    
    def has_object_permission(self, request, view, obj):
        # Permissões de leitura para qualquer request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Permissões de escrita apenas para o dono do objeto
        return obj.registro.usuario == request.user


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada para permitir apenas administradores e superiores editarem
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        user_groups = [group.name for group in request.user.groups.all()]
        return any(group in user_groups for group in ['Administrador', 'Superior'])


class SuperiorPermission(permissions.BasePermission):
    """
    Permissão específica para o grupo Superior: pode criar e editar, mas não excluir
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        user_groups = [group.name for group in request.user.groups.all()]
        
        # Administradores têm acesso total
        if 'Administrador' in user_groups:
            return True
        
        # Superiores podem criar e editar, mas não excluir
        if 'Superior' in user_groups:
            if request.method == 'DELETE':
                return False  # Superiores não podem excluir
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user_groups = [group.name for group in request.user.groups.all()]
        
        # Administradores têm acesso total
        if 'Administrador' in user_groups:
            return True
        
        # Superiores podem editar, mas não excluir
        if 'Superior' in user_groups:
            if request.method == 'DELETE':
                return False  # Superiores não podem excluir
            return True
        
        return False


class CanDeleteRegistro(permissions.BasePermission):
    """
    Permissão para deletar registros - apenas administradores
    """
    
    def has_permission(self, request, view):
        if request.method != 'DELETE':
            return True
        
        user_groups = [group.name for group in request.user.groups.all()]
        return 'Administrador' in user_groups


class CanEditFinancialFields(permissions.BasePermission):
    """
    Permissão para editar campos financeiros
    """
    
    def has_permission(self, request, view):
        # Campos financeiros que clientes não podem editar
        financial_fields = [
            'valor_fabricacao', 'valor_levantamento', 'valor_material_fabricacao',
            'valor_material_pintura', 'valor_servico_pintura_revestimento',
            'valor_montagem', 'valor_material_montagem', 'valor_inspecao',
            'valor_hh', 'valor_manutencao_valvula', 'valor_servico_terceiros',
            'soma_valores', 'soma_notas_fiscais', 'saldo_final'
        ]
        
        user_groups = [group.name for group in request.user.groups.all()]
        
        # Clientes não podem editar campos financeiros
        if 'Cliente' in user_groups:
            if request.method in ['POST', 'PUT', 'PATCH']:
                for field in financial_fields:
                    if field in request.data:
                        return False
        
        return True


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permissão para permitir apenas ao dono ou administradores acessarem o objeto
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        user_groups = [group.name for group in user.groups.all()]
        
        # Administradores têm acesso total
        if 'Administrador' in user_groups:
            return True
        
        # Superiores, Qualidade e Técnicos têm acesso total
        if any(group in user_groups for group in ["Superior", "Qualidade", "Tecnico"]):
            return True
        
        # Outros usuários só podem acessar seus próprios objetos
        return obj.usuario == user

