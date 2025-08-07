#!/bin/bash

# =============================================================================
# SCRIPT: 18-protect-admin.sh
# DESCRIÇÃO: Protege /admin do Django com restrições de IP no nginx
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./18-protect-admin.sh [--add-ip IP] [--remove-ip IP] [--disable] [--enable]
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
NGINX_CONF_DIR="nginx"
NGINX_CONF_FILE="nginx/nginx.conf"
ADMIN_IPS_FILE="nginx/admin_allowed_ips.conf"
BACKUP_DIR="/backups/nginx"

# IPs padrão permitidos (adicione os seus)
DEFAULT_ALLOWED_IPS=(
    "127.0.0.1"
    "::1"
)

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para verificar dependências
check_dependencies() {
    print_message $BLUE "🔍 Verificando dependências..."
    
    # Verifica se o diretório nginx existe
    if [[ ! -d "$NGINX_CONF_DIR" ]]; then
        print_message $RED "ERRO: Diretório $NGINX_CONF_DIR não encontrado"
        exit 1
    fi
    
    # Verifica se o arquivo nginx.conf existe
    if [[ ! -f "$NGINX_CONF_FILE" ]]; then
        print_message $RED "ERRO: Arquivo $NGINX_CONF_FILE não encontrado"
        exit 1
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para fazer backup da configuração atual
backup_current_config() {
    print_message $BLUE "💾 Fazendo backup da configuração atual..."
    
    # Cria diretório de backup
    mkdir -p "$BACKUP_DIR"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/nginx_backup_$timestamp"
    
    # Copia arquivos de configuração
    cp "$NGINX_CONF_FILE" "$backup_file.conf"
    if [[ -f "$ADMIN_IPS_FILE" ]]; then
        cp "$ADMIN_IPS_FILE" "$backup_file.ips"
    fi
    
    print_message $GREEN "✅ Backup salvo em: $backup_file"
}

# Função para validar IP
validate_ip() {
    local ip="$1"
    
    # Valida formato IPv4
    if [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        local IFS='.'
        local -a octets=($ip)
        for octet in "${octets[@]}"; do
            if [[ "$octet" -lt 0 || "$octet" -gt 255 ]]; then
                return 1
            fi
        done
        return 0
    fi
    
    # Valida formato IPv6 básico
    if [[ "$ip" =~ ^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$ ]]; then
        return 0
    fi
    
    return 1
}

# Função para adicionar IP à lista de permitidos
add_allowed_ip() {
    local ip="$1"
    
    if [[ -z "$ip" ]]; then
        print_message $RED "ERRO: IP não fornecido"
        return 1
    fi
    
    if ! validate_ip "$ip"; then
        print_message $RED "ERRO: IP inválido: $ip"
        return 1
    fi
    
    print_message $BLUE "➕ Adicionando IP $ip à lista de permitidos..."
    
    # Cria arquivo se não existir
    if [[ ! -f "$ADMIN_IPS_FILE" ]]; then
        cat > "$ADMIN_IPS_FILE" << EOF
# IPs permitidos para acessar /admin
# Gerado automaticamente em $(date)

EOF
    fi
    
    # Verifica se o IP já está na lista
    if grep -q "^allow $ip;" "$ADMIN_IPS_FILE"; then
        print_message $YELLOW "⚠️  IP $ip já está na lista de permitidos"
        return 0
    fi
    
    # Adiciona o IP
    echo "allow $ip;" >> "$ADMIN_IPS_FILE"
    print_message $GREEN "✅ IP $ip adicionado à lista de permitidos"
    
    # Recarrega nginx se estiver rodando
    reload_nginx
}

# Função para remover IP da lista de permitidos
remove_allowed_ip() {
    local ip="$1"
    
    if [[ -z "$ip" ]]; then
        print_message $RED "ERRO: IP não fornecido"
        return 1
    fi
    
    print_message $BLUE "➖ Removendo IP $ip da lista de permitidos..."
    
    if [[ ! -f "$ADMIN_IPS_FILE" ]]; then
        print_message $YELLOW "⚠️  Arquivo de IPs não encontrado"
        return 0
    fi
    
    # Remove o IP
    if sed -i "/^allow $ip;/d" "$ADMIN_IPS_FILE"; then
        print_message $GREEN "✅ IP $ip removido da lista de permitidos"
        
        # Recarrega nginx se estiver rodando
        reload_nginx
    else
        print_message $YELLOW "⚠️  IP $ip não encontrado na lista"
    fi
}

# Função para configurar proteção do admin
configure_admin_protection() {
    print_message $BLUE "🔒 Configurando proteção do /admin..."
    
    # Cria arquivo de IPs permitidos se não existir
    if [[ ! -f "$ADMIN_IPS_FILE" ]]; then
        print_message $BLUE "📝 Criando arquivo de IPs permitidos..."
        
        cat > "$ADMIN_IPS_FILE" << EOF
# IPs permitidos para acessar /admin
# Gerado automaticamente em $(date)

# IPs padrão
EOF
        
        # Adiciona IPs padrão
        for ip in "${DEFAULT_ALLOWED_IPS[@]}"; do
            echo "allow $ip;" >> "$ADMIN_IPS_FILE"
        done
        
        echo "" >> "$ADMIN_IPS_FILE"
        echo "# Adicione mais IPs conforme necessário" >> "$ADMIN_IPS_FILE"
        echo "# allow 192.168.1.100;" >> "$ADMIN_IPS_FILE"
        echo "# allow 10.0.0.50;" >> "$ADMIN_IPS_FILE"
    fi
    
    # Verifica se a configuração do nginx já inclui proteção
    if grep -q "include.*admin_allowed_ips.conf" "$NGINX_CONF_FILE"; then
        print_message $GREEN "✅ Proteção do admin já configurada"
        return 0
    fi
    
    # Adiciona configuração de proteção ao nginx
    print_message $BLUE "🔧 Adicionando configuração de proteção ao nginx..."
    
    # Cria backup antes de modificar
    cp "$NGINX_CONF_FILE" "${NGINX_CONF_FILE}.backup"
    
    # Adiciona configuração de proteção
    local protection_config="
    # Proteção do /admin
    location /admin {
        include $ADMIN_IPS_FILE;
        deny all;
        
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }"
    
    # Insere a configuração antes do fechamento do server block
    sed -i '/^    }$/i\'"$protection_config" "$NGINX_CONF_FILE"
    
    print_message $GREEN "✅ Configuração de proteção adicionada"
}

# Função para desabilitar proteção
disable_admin_protection() {
    print_message $BLUE "🔓 Desabilitando proteção do /admin..."
    
    # Remove a configuração de proteção
    if sed -i '/# Proteção do \/admin/,/^    }$/d' "$NGINX_CONF_FILE"; then
        print_message $GREEN "✅ Proteção do admin desabilitada"
        
        # Recarrega nginx
        reload_nginx
    else
        print_message $YELLOW "⚠️  Configuração de proteção não encontrada"
    fi
}

# Função para habilitar proteção
enable_admin_protection() {
    print_message $BLUE "🔒 Habilitando proteção do /admin..."
    
    # Verifica se já está habilitada
    if grep -q "location /admin" "$NGINX_CONF_FILE"; then
        print_message $GREEN "✅ Proteção do admin já está habilitada"
        return 0
    fi
    
    # Configura proteção
    configure_admin_protection
    
    # Recarrega nginx
    reload_nginx
}

# Função para recarregar nginx
reload_nginx() {
    print_message $BLUE "🔄 Recarregando nginx..."
    
    # Verifica se nginx está rodando
    if docker-compose ps frontend | grep -q "Up"; then
        print_message $BLUE "🐳 Recarregando nginx no container..."
        
        if docker-compose exec frontend nginx -s reload; then
            print_message $GREEN "✅ Nginx recarregado com sucesso"
        else
            print_message $YELLOW "⚠️  Falha ao recarregar nginx, reiniciando container..."
            docker-compose restart frontend
        fi
    else
        print_message $YELLOW "⚠️  Container frontend não está rodando"
    fi
}

# Função para listar IPs permitidos
list_allowed_ips() {
    print_message $BLUE "📋 Listando IPs permitidos..."
    
    if [[ -f "$ADMIN_IPS_FILE" ]]; then
        echo "IPs permitidos para acessar /admin:"
        grep "^allow" "$ADMIN_IPS_FILE" | sed 's/allow //' | sed 's/;//'
    else
        print_message $YELLOW "⚠️  Arquivo de IPs não encontrado"
    fi
}

# Função para testar acesso ao admin
test_admin_access() {
    print_message $BLUE "🧪 Testando acesso ao /admin..."
    
    # Testa acesso local
    if curl -f -s http://localhost:8000/admin/ >/dev/null 2>&1; then
        print_message $GREEN "✅ Acesso local ao /admin OK"
    else
        print_message $RED "❌ Acesso local ao /admin falhou"
    fi
    
    # Testa através do nginx
    if curl -f -s http://localhost/admin/ >/dev/null 2>&1; then
        print_message $GREEN "✅ Acesso via nginx ao /admin OK"
    else
        print_message $RED "❌ Acesso via nginx ao /admin falhou"
    fi
}

# Função para gerar relatório de segurança
generate_security_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="/tmp/admin_security_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de segurança..."
    
    {
        echo "=== RELATÓRIO DE SEGURANÇA DO /ADMIN ==="
        echo "Data/Hora: $(date)"
        echo ""
        echo "=== CONFIGURAÇÃO ATUAL ==="
        if [[ -f "$ADMIN_IPS_FILE" ]]; then
            echo "Arquivo de IPs permitidos:"
            cat "$ADMIN_IPS_FILE"
        else
            echo "Arquivo de IPs não encontrado"
        fi
        echo ""
        echo "=== CONFIGURAÇÃO NGINX ==="
        if grep -A 10 -B 5 "location /admin" "$NGINX_CONF_FILE"; then
            echo "Proteção configurada no nginx"
        else
            echo "Proteção NÃO configurada no nginx"
        fi
        echo ""
        echo "=== STATUS DOS CONTAINERS ==="
        docker-compose ps
        echo ""
        echo "=== RECOMENDAÇÕES DE SEGURANÇA ==="
        echo "1. Use apenas IPs confiáveis na lista de permitidos"
        echo "2. Considere usar VPN para acesso remoto"
        echo "3. Monitore logs de acesso ao /admin"
        echo "4. Use autenticação forte no Django"
        echo "5. Considere usar HTTPS para acesso ao admin"
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO CONFIGURAÇÃO DE PROTEÇÃO DO /ADMIN"
    echo
    
    # Verificações iniciais
    check_dependencies
    echo
    
    # Backup da configuração atual
    backup_current_config
    echo
    
    # Processa argumentos
    case "${1:-}" in
        --add-ip)
            if [[ -n "${2:-}" ]]; then
                add_allowed_ip "$2"
            else
                print_message $RED "ERRO: IP não fornecido"
                exit 1
            fi
            ;;
        --remove-ip)
            if [[ -n "${2:-}" ]]; then
                remove_allowed_ip "$2"
            else
                print_message $RED "ERRO: IP não fornecido"
                exit 1
            fi
            ;;
        --disable)
            disable_admin_protection
            ;;
        --enable)
            enable_admin_protection
            ;;
        --list)
            list_allowed_ips
            ;;
        --test)
            test_admin_access
            ;;
        --report)
            generate_security_report
            ;;
        *)
            # Modo interativo
            print_message $BLUE "🔧 CONFIGURAÇÃO DE PROTEÇÃO DO /ADMIN:"
            echo
            echo "1. 🔒 Configurar proteção básica"
            echo "2. ➕ Adicionar IP permitido"
            echo "3. ➖ Remover IP permitido"
            echo "4. 📋 Listar IPs permitidos"
            echo "5. 🧪 Testar acesso"
            echo "6. 📊 Gerar relatório"
            echo "7. 🔓 Desabilitar proteção"
            echo "8. 🔒 Habilitar proteção"
            echo
            
            read -p "Escolha uma opção (1-8): " choice
            
            case $choice in
                1)
                    configure_admin_protection
                    reload_nginx
                    ;;
                2)
                    read -p "Digite o IP a ser adicionado: " ip
                    add_allowed_ip "$ip"
                    ;;
                3)
                    read -p "Digite o IP a ser removido: " ip
                    remove_allowed_ip "$ip"
                    ;;
                4)
                    list_allowed_ips
                    ;;
                5)
                    test_admin_access
                    ;;
                6)
                    generate_security_report
                    ;;
                7)
                    disable_admin_protection
                    ;;
                8)
                    enable_admin_protection
                    ;;
                *)
                    print_message $YELLOW "Opção inválida"
                    ;;
            esac
            ;;
    esac
    
    echo
    print_message $GREEN "✅ CONFIGURAÇÃO DE PROTEÇÃO CONCLUÍDA!"
}

# Executa o script
main "$@" 