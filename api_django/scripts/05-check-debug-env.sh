#!/bin/bash

# =============================================================================
# SCRIPT: 05-check-debug-env.sh
# DESCRIÇÃO: Verifica DEBUG=False e variáveis essenciais no .env em produção
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./05-check-debug-env.sh [--fix] [--backup]
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
ENV_FILE=".env"
ENV_EXAMPLE="env.example"
BACKUP_DIR="/backups/env"

# Variáveis essenciais que devem estar presentes
ESSENTIAL_VARS=(
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "DEBUG"
    "SECRET_KEY"
    "ALLOWED_HOSTS"
)

# Variáveis que devem ser seguras em produção
SECURE_VARS=(
    "SECRET_KEY"
    "POSTGRES_PASSWORD"
    "EMAIL_HOST_PASSWORD"
)

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para verificar se o arquivo .env existe
check_env_file() {
    print_message $BLUE "📄 Verificando arquivo .env..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_message $RED "❌ ERRO: Arquivo .env não encontrado!"
        
        if [[ -f "$ENV_EXAMPLE" ]]; then
            print_message $YELLOW "💡 Sugestão: Copie o arquivo de exemplo:"
            echo "   cp $ENV_EXAMPLE $ENV_FILE"
            echo "   nano $ENV_FILE  # Edite as variáveis"
        fi
        return 1
    fi
    
    print_message $GREEN "✅ Arquivo .env encontrado"
    return 0
}

# Função para verificar se DEBUG está False
check_debug_setting() {
    print_message $BLUE "🔍 Verificando configuração DEBUG..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_message $RED "❌ Arquivo .env não encontrado"
        return 1
    fi
    
    # Busca a linha DEBUG no arquivo
    local debug_line=$(grep -i "^DEBUG=" "$ENV_FILE" || echo "")
    
    if [[ -z "$debug_line" ]]; then
        print_message $RED "❌ ERRO: Variável DEBUG não encontrada no .env"
        return 1
    fi
    
    # Extrai o valor
    local debug_value=$(echo "$debug_line" | cut -d'=' -f2 | tr -d ' ')
    
    if [[ "$debug_value" == "True" || "$debug_value" == "true" ]]; then
        print_message $RED "🚨 ALERTA CRÍTICO: DEBUG=True em produção!"
        print_message $YELLOW "💡 Isso pode expor informações sensíveis"
        return 1
    elif [[ "$debug_value" == "False" || "$debug_value" == "false" ]]; then
        print_message $GREEN "✅ DEBUG=False (configuração segura)"
        return 0
    else
        print_message $YELLOW "⚠️  Valor DEBUG inválido: $debug_value"
        return 1
    fi
}

# Função para verificar variáveis essenciais
check_essential_vars() {
    print_message $BLUE "🔧 Verificando variáveis essenciais..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_message $RED "❌ Arquivo .env não encontrado"
        return 1
    fi
    
    local missing_vars=()
    local empty_vars=()
    
    for var in "${ESSENTIAL_VARS[@]}"; do
        local line=$(grep -i "^${var}=" "$ENV_FILE" || echo "")
        
        if [[ -z "$line" ]]; then
            missing_vars+=("$var")
        else
            local value=$(echo "$line" | cut -d'=' -f2 | tr -d ' ')
            if [[ -z "$value" || "$value" == "" ]]; then
                empty_vars+=("$var")
            fi
        fi
    done
    
    # Reporta variáveis faltantes
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_message $RED "❌ Variáveis faltando: ${missing_vars[*]}"
    fi
    
    # Reporta variáveis vazias
    if [[ ${#empty_vars[@]} -gt 0 ]]; then
        print_message $YELLOW "⚠️  Variáveis vazias: ${empty_vars[*]}"
    fi
    
    # Verifica se todas estão presentes e preenchidas
    if [[ ${#missing_vars[@]} -eq 0 && ${#empty_vars[@]} -eq 0 ]]; then
        print_message $GREEN "✅ Todas as variáveis essenciais estão configuradas"
        return 0
    else
        return 1
    fi
}

# Função para verificar segurança das variáveis
check_security_vars() {
    print_message $BLUE "🔐 Verificando segurança das variáveis..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_message $RED "❌ Arquivo .env não encontrado"
        return 1
    fi
    
    local security_issues=()
    
    for var in "${SECURE_VARS[@]}"; do
        local line=$(grep -i "^${var}=" "$ENV_FILE" || echo "")
        
        if [[ -n "$line" ]]; then
            local value=$(echo "$line" | cut -d'=' -f2 | tr -d ' ')
            
            # Verifica se o valor é muito simples
            if [[ "$value" == "default" || "$value" == "password" || "$value" == "secret" ]]; then
                security_issues+=("$var (valor muito simples)")
            fi
            
            # Verifica se SECRET_KEY é muito curto
            if [[ "$var" == "SECRET_KEY" && ${#value} -lt 20 ]]; then
                security_issues+=("$var (muito curto)")
            fi
        fi
    done
    
    if [[ ${#security_issues[@]} -gt 0 ]]; then
        print_message $YELLOW "⚠️  Problemas de segurança encontrados:"
        for issue in "${security_issues[@]}"; do
            print_message $YELLOW "   - $issue"
        done
        return 1
    else
        print_message $GREEN "✅ Variáveis de segurança OK"
        return 0
    fi
}

# Função para verificar ALLOWED_HOSTS
check_allowed_hosts() {
    print_message $BLUE "🌐 Verificando ALLOWED_HOSTS..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_message $RED "❌ Arquivo .env não encontrado"
        return 1
    fi
    
    local allowed_hosts_line=$(grep -i "^ALLOWED_HOSTS=" "$ENV_FILE" || echo "")
    
    if [[ -z "$allowed_hosts_line" ]]; then
        print_message $RED "❌ ALLOWED_HOSTS não configurado"
        return 1
    fi
    
    local allowed_hosts_value=$(echo "$allowed_hosts_line" | cut -d'=' -f2 | tr -d ' ')
    
    # Verifica se contém localhost ou *
    if [[ "$allowed_hosts_value" == "*" ]]; then
        print_message $RED "🚨 ALERTA: ALLOWED_HOSTS=* (muito permissivo)"
        return 1
    elif [[ "$allowed_hosts_value" == "localhost,127.0.0.1" ]]; then
        print_message $YELLOW "⚠️  ALLOWED_HOSTS apenas localhost (pode não funcionar em produção)"
        return 1
    else
        print_message $GREEN "✅ ALLOWED_HOSTS configurado adequadamente"
        return 0
    fi
}

# Função para verificar permissões do arquivo .env
check_env_permissions() {
    print_message $BLUE "🔒 Verificando permissões do arquivo .env..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_message $RED "❌ Arquivo .env não encontrado"
        return 1
    fi
    
    local permissions=$(stat -c %a "$ENV_FILE")
    local owner=$(stat -c %U "$ENV_FILE")
    
    print_message $BLUE "📊 Permissões: $permissions, Proprietário: $owner"
    
    # Verifica se as permissões são muito abertas
    if [[ "$permissions" == "666" || "$permissions" == "777" ]]; then
        print_message $RED "🚨 ALERTA: Permissões muito abertas ($permissions)"
        return 1
    elif [[ "$permissions" == "644" || "$permissions" == "600" ]]; then
        print_message $GREEN "✅ Permissões adequadas ($permissions)"
        return 0
    else
        print_message $YELLOW "⚠️  Permissões não ideais ($permissions)"
        return 1
    fi
}

# Função para fazer backup do .env
backup_env_file() {
    if [[ "${2:-}" == "--backup" ]]; then
        print_message $BLUE "💾 Fazendo backup do arquivo .env..."
        
        if [[ ! -f "$ENV_FILE" ]]; then
            print_message $RED "❌ Arquivo .env não encontrado para backup"
            return 1
        fi
        
        # Cria diretório de backup se não existir
        mkdir -p "$BACKUP_DIR"
        
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="$BACKUP_DIR/.env.backup_$timestamp"
        
        cp "$ENV_FILE" "$backup_file"
        print_message $GREEN "✅ Backup salvo em: $backup_file"
        
        # Criptografa o backup se possível
        if command -v gpg >/dev/null 2>&1; then
            gpg --encrypt --recipient "$(whoami)" "$backup_file" 2>/dev/null && \
            rm "$backup_file" && \
            print_message $GREEN "✅ Backup criptografado: $backup_file.gpg"
        fi
    fi
}

# Função para corrigir problemas automaticamente
fix_issues() {
    if [[ "${1:-}" == "--fix" ]]; then
        print_message $BLUE "🔧 Tentando corrigir problemas automaticamente..."
        
        if [[ ! -f "$ENV_FILE" ]]; then
            print_message $RED "❌ Arquivo .env não encontrado"
            return 1
        fi
        
        local fixed=0
        
        # Corrige DEBUG=True
        if grep -q "^DEBUG=True" "$ENV_FILE"; then
            sed -i 's/^DEBUG=True/DEBUG=False/' "$ENV_FILE"
            print_message $GREEN "✅ DEBUG corrigido para False"
            fixed=1
        fi
        
        # Corrige ALLOWED_HOSTS muito permissivo
        if grep -q "^ALLOWED_HOSTS=\*" "$ENV_FILE"; then
            sed -i 's/^ALLOWED_HOSTS=\*/ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com/' "$ENV_FILE"
            print_message $GREEN "✅ ALLOWED_HOSTS corrigido"
            fixed=1
        fi
        
        # Corrige permissões se muito abertas
        local permissions=$(stat -c %a "$ENV_FILE")
        if [[ "$permissions" == "666" || "$permissions" == "777" ]]; then
            chmod 600 "$ENV_FILE"
            print_message $GREEN "✅ Permissões corrigidas para 600"
            fixed=1
        fi
        
        if [[ "$fixed" -eq 1 ]]; then
            print_message $GREEN "✅ Problemas corrigidos automaticamente"
        else
            print_message $YELLOW "⚠️  Nenhum problema corrigido automaticamente"
        fi
    fi
}

# Função para gerar relatório
generate_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="/tmp/env_check_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de verificação..."
    
    {
        echo "=== RELATÓRIO DE VERIFICAÇÃO DO .ENV ==="
        echo "Data/Hora: $(date)"
        echo "Arquivo: $ENV_FILE"
        echo ""
        echo "=== CONFIGURAÇÕES ATUAIS ==="
        if [[ -f "$ENV_FILE" ]]; then
            # Mostra configurações sem expor senhas
            grep -v -i "password\|secret" "$ENV_FILE" | head -20
            echo "..."
        else
            echo "Arquivo .env não encontrado"
        fi
        echo ""
        echo "=== PERMISSÕES ==="
        if [[ -f "$ENV_FILE" ]]; then
            ls -la "$ENV_FILE"
        fi
        echo ""
        echo "=== SUGESTÕES ==="
        echo "1. Sempre use DEBUG=False em produção"
        echo "2. Configure ALLOWED_HOSTS com domínios específicos"
        echo "3. Use SECRET_KEY forte (mínimo 50 caracteres)"
        echo "4. Mantenha permissões 600 no arquivo .env"
        echo "5. Faça backup regular do arquivo .env"
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO VERIFICAÇÃO DO ARQUIVO .ENV"
    echo
    
    # Verificações
    local overall_status=0
    
    check_env_file || overall_status=1
    echo
    check_debug_setting || overall_status=1
    echo
    check_essential_vars || overall_status=1
    echo
    check_security_vars || overall_status=1
    echo
    check_allowed_hosts || overall_status=1
    echo
    check_env_permissions || overall_status=1
    echo
    
    # Backup e correções
    backup_env_file "$@"
    echo
    fix_issues "$@"
    echo
    
    # Relatório final
    generate_report
    echo
    
    if [[ "$overall_status" -eq 0 ]]; then
        print_message $GREEN "✅ TODAS AS VERIFICAÇÕES PASSARAM!"
        print_message $BLUE "🔒 Configurações de segurança adequadas"
    else
        print_message $RED "❌ PROBLEMAS ENCONTRADOS!"
        print_message $YELLOW "💡 Revise as configurações antes de prosseguir"
    fi
}

# Executa o script
main "$@" 