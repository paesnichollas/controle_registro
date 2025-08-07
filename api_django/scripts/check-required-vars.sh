#!/bin/bash

# =============================================================================
# SCRIPT: check-required-vars.sh
# DESCRIÇÃO: Verifica se as variáveis obrigatórias estão preenchidas no .env
# USO: ./scripts/check-required-vars.sh
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Variáveis obrigatórias que devem estar preenchidas
REQUIRED_VARS=(
    "SECRET_KEY"
    "POSTGRES_PASSWORD"
    "DJANGO_SUPERUSER_PASSWORD"
)

# Valores padrão que indicam que a variável não foi alterada
DEFAULT_VALUES=(
    "django-insecure-change-this-in-production"
    "postgres"
    "admin123"
)

# Função para verificar se o arquivo .env existe
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error "❌ Arquivo .env não encontrado!"
        print_info "💡 Para criar o arquivo .env:"
        echo "   1. Copie o arquivo de exemplo: cp env.example .env"
        echo "   2. Edite as variáveis obrigatórias: nano .env"
        echo "   3. Execute este script novamente"
        return 1
    fi
    print_message "✅ Arquivo .env encontrado"
    return 0
}

# Função para verificar uma variável específica
check_variable() {
    local var_name="$1"
    local default_value="$2"
    
    # Buscar a linha da variável no arquivo .env
    local line=$(grep -i "^${var_name}=" .env 2>/dev/null || echo "")
    
    if [ -z "$line" ]; then
        print_error "❌ Variável $var_name não encontrada no .env"
        return 1
    fi
    
    # Extrair o valor da variável
    local value=$(echo "$line" | cut -d'=' -f2- | tr -d ' ')
    
    if [ -z "$value" ]; then
        print_error "❌ Variável $var_name está vazia"
        return 1
    fi
    
    # Verificar se é um valor padrão
    if [ "$value" = "$default_value" ]; then
        print_warning "⚠️  Variável $var_name ainda usa valor padrão"
        print_info "💡 Altere o valor para algo seguro"
        return 1
    fi
    
    # Verificar se SECRET_KEY é muito curta
    if [ "$var_name" = "SECRET_KEY" ] && [ ${#value} -lt 50 ]; then
        print_warning "⚠️  SECRET_KEY muito curta (${#value} caracteres)"
        print_info "💡 Use pelo menos 50 caracteres"
        return 1
    fi
    
    # Verificar se a senha é muito simples
    if [ "$var_name" = "POSTGRES_PASSWORD" ] && [ "$value" = "postgres" ]; then
        print_warning "⚠️  POSTGRES_PASSWORD ainda usa valor padrão"
        return 1
    fi
    
    if [ "$var_name" = "DJANGO_SUPERUSER_PASSWORD" ] && [ "$value" = "admin123" ]; then
        print_warning "⚠️  DJANGO_SUPERUSER_PASSWORD ainda usa valor padrão"
        return 1
    fi
    
    print_message "✅ Variável $var_name configurada adequadamente"
    return 0
}

# Função para gerar valores seguros
generate_secure_values() {
    print_info "🔐 Gerando valores seguros..."
    
    # Gerar SECRET_KEY
    local secret_key=$(python3 -c "
import secrets
import string
chars = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
print(''.join(secrets.choice(chars) for _ in range(50)))
" 2>/dev/null || echo "django-insecure-$(openssl rand -hex 25)")
    
    # Gerar senhas
    local db_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    local admin_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    echo ""
    print_message "🔑 VALORES SEGUROS GERADOS:"
    echo ""
    echo "SECRET_KEY=$secret_key"
    echo ""
    echo "POSTGRES_PASSWORD=$db_password"
    echo ""
    echo "DJANGO_SUPERUSER_PASSWORD=$admin_password"
    echo ""
    print_info "💡 Copie estes valores para seu arquivo .env"
}

# Função para mostrar instruções
show_instructions() {
    echo ""
    print_info "📋 INSTRUÇÕES PARA CONFIGURAR O .ENV:"
    echo ""
    echo "1. Abra o arquivo .env:"
    echo "   nano .env"
    echo ""
    echo "2. Altere as seguintes variáveis OBRIGATÓRIAS:"
    echo "   - SECRET_KEY (mínimo 50 caracteres)"
    echo "   - POSTGRES_PASSWORD (senha forte para o banco)"
    echo "   - DJANGO_SUPERUSER_PASSWORD (senha forte para admin)"
    echo ""
    echo "3. Para gerar valores seguros automaticamente:"
    echo "   ./scripts/10-generate-secrets.sh -e"
    echo ""
    echo "4. Execute este script novamente para verificar:"
    echo "   ./scripts/check-required-vars.sh"
    echo ""
    print_warning "⚠️  IMPORTANTE:"
    echo "   - Nunca commite o arquivo .env no Git"
    echo "   - Use valores diferentes para cada ambiente"
    echo "   - Troque as senhas regularmente"
}

# Função principal
main() {
    print_message "🔍 VERIFICANDO VARIÁVEIS OBRIGATÓRIAS"
    echo ""
    
    # Verificar se estamos no diretório correto
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Execute este script no diretório raiz do projeto"
        echo "   Diretório atual: $(pwd)"
        return 1
    fi
    
    # Verificar arquivo .env
    if ! check_env_file; then
        show_instructions
        return 1
    fi
    
    echo ""
    print_info "🔧 Verificando variáveis obrigatórias..."
    echo ""
    
    local all_ok=true
    local i=0
    
    # Verificar cada variável obrigatória
    for var in "${REQUIRED_VARS[@]}"; do
        local default_val="${DEFAULT_VALUES[$i]}"
        
        if ! check_variable "$var" "$default_val"; then
            all_ok=false
        fi
        
        echo ""
        ((i++))
    done
    
    echo ""
    
    if [ "$all_ok" = true ]; then
        print_message "✅ TODAS AS VARIÁVEIS OBRIGATÓRIAS ESTÃO CONFIGURADAS!"
        print_info "🎉 Você pode prosseguir com a execução dos containers"
    else
        print_error "❌ PROBLEMAS ENCONTRADOS NAS VARIÁVEIS!"
        echo ""
        print_info "💡 Para gerar valores seguros automaticamente:"
        echo "   ./scripts/10-generate-secrets.sh -e"
        echo ""
        show_instructions
        return 1
    fi
}

# Executar função principal
main "$@"
