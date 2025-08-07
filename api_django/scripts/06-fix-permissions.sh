#!/bin/bash

# =============================================================================
# SCRIPT: 06-fix-permissions.sh
# DESCRIÇÃO: Ajusta permissões das pastas media/static para evitar erros de acesso
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./06-fix-permissions.sh [--dry-run] [--backup]
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
MEDIA_DIR="media"
STATIC_DIR="staticfiles"
BACKUP_DIR="/backups/permissions"
COMPOSE_FILE="docker-compose.yml"

# Permissões recomendadas
RECOMMENDED_DIR_PERMS="755"
RECOMMENDED_FILE_PERMS="644"
RECOMMENDED_OWNER="www-data"

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para verificar dependências
check_dependencies() {
    print_message $BLUE "🔍 Verificando dependências..."
    
    # Verifica se está rodando como root ou com sudo
    if [[ $EUID -ne 0 ]]; then
        print_message $YELLOW "⚠️  Executando sem privilégios de root"
        print_message $YELLOW "💡 Algumas operações podem falhar"
    fi
    
    # Verifica se os diretórios existem
    if [[ ! -d "$MEDIA_DIR" ]]; then
        print_message $YELLOW "⚠️  Diretório $MEDIA_DIR não encontrado"
    fi
    
    if [[ ! -d "$STATIC_DIR" ]]; then
        print_message $YELLOW "⚠️  Diretório $STATIC_DIR não encontrado"
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para fazer backup das permissões atuais
backup_current_permissions() {
    if [[ "${2:-}" == "--backup" ]]; then
        print_message $BLUE "💾 Fazendo backup das permissões atuais..."
        
        # Cria diretório de backup
        mkdir -p "$BACKUP_DIR"
        
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="$BACKUP_DIR/permissions_backup_$timestamp.txt"
        
        {
            echo "=== BACKUP DE PERMISSÕES ==="
            echo "Data/Hora: $(date)"
            echo ""
            echo "=== PERMISSÕES ATUAIS ==="
            if [[ -d "$MEDIA_DIR" ]]; then
                echo "--- $MEDIA_DIR ---"
                ls -la "$MEDIA_DIR"
                echo ""
            fi
            if [[ -d "$STATIC_DIR" ]]; then
                echo "--- $STATIC_DIR ---"
                ls -la "$STATIC_DIR"
                echo ""
            fi
            echo "=== OWNERSHIP ATUAL ==="
            if [[ -d "$MEDIA_DIR" ]]; then
                stat "$MEDIA_DIR"
                echo ""
            fi
            if [[ -d "$STATIC_DIR" ]]; then
                stat "$STATIC_DIR"
            fi
        } > "$backup_file"
        
        print_message $GREEN "✅ Backup salvo em: $backup_file"
    fi
}

# Função para verificar permissões atuais
check_current_permissions() {
    print_message $BLUE "🔍 Verificando permissões atuais..."
    
    local issues_found=0
    
    # Verifica diretório media
    if [[ -d "$MEDIA_DIR" ]]; then
        print_message $BLUE "📁 Verificando $MEDIA_DIR..."
        
        local media_perms=$(stat -c %a "$MEDIA_DIR")
        local media_owner=$(stat -c %U "$MEDIA_DIR")
        
        print_message $BLUE "📊 Permissões: $media_perms, Proprietário: $media_owner"
        
        # Verifica se as permissões são adequadas
        if [[ "$media_perms" != "755" && "$media_perms" != "775" ]]; then
            print_message $YELLOW "⚠️  Permissões do diretório media não ideais: $media_perms"
            issues_found=1
        fi
        
        # Verifica se o proprietário é adequado
        if [[ "$media_owner" != "www-data" && "$media_owner" != "root" ]]; then
            print_message $YELLOW "⚠️  Proprietário do diretório media não ideal: $media_owner"
            issues_found=1
        fi
    else
        print_message $YELLOW "⚠️  Diretório $MEDIA_DIR não encontrado"
    fi
    
    # Verifica diretório staticfiles
    if [[ -d "$STATIC_DIR" ]]; then
        print_message $BLUE "📁 Verificando $STATIC_DIR..."
        
        local static_perms=$(stat -c %a "$STATIC_DIR")
        local static_owner=$(stat -c %U "$STATIC_DIR")
        
        print_message $BLUE "📊 Permissões: $static_perms, Proprietário: $static_owner"
        
        # Verifica se as permissões são adequadas
        if [[ "$static_perms" != "755" && "$static_perms" != "775" ]]; then
            print_message $YELLOW "⚠️  Permissões do diretório staticfiles não ideais: $static_perms"
            issues_found=1
        fi
        
        # Verifica se o proprietário é adequado
        if [[ "$static_owner" != "www-data" && "$static_owner" != "root" ]]; then
            print_message $YELLOW "⚠️  Proprietário do diretório staticfiles não ideal: $static_owner"
            issues_found=1
        fi
    else
        print_message $YELLOW "⚠️  Diretório $STATIC_DIR não encontrado"
    fi
    
    # Verifica arquivos dentro dos diretórios
    if [[ -d "$MEDIA_DIR" ]]; then
        print_message $BLUE "📄 Verificando arquivos em $MEDIA_DIR..."
        
        local problematic_files=$(find "$MEDIA_DIR" -type f -not -perm 644 2>/dev/null | wc -l)
        if [[ "$problematic_files" -gt 0 ]]; then
            print_message $YELLOW "⚠️  $problematic_files arquivos com permissões inadequadas em $MEDIA_DIR"
            issues_found=1
        fi
    fi
    
    if [[ -d "$STATIC_DIR" ]]; then
        print_message $BLUE "📄 Verificando arquivos em $STATIC_DIR..."
        
        local problematic_files=$(find "$STATIC_DIR" -type f -not -perm 644 2>/dev/null | wc -l)
        if [[ "$problematic_files" -gt 0 ]]; then
            print_message $YELLOW "⚠️  $problematic_files arquivos com permissões inadequadas em $STATIC_DIR"
            issues_found=1
        fi
    fi
    
    if [[ "$issues_found" -eq 0 ]]; then
        print_message $GREEN "✅ Permissões atuais adequadas"
        return 0
    else
        return 1
    fi
}

# Função para corrigir permissões
fix_permissions() {
    local dry_run="${1:-}"
    
    print_message $BLUE "🔧 Corrigindo permissões..."
    
    if [[ "$dry_run" == "--dry-run" ]]; then
        print_message $YELLOW "🧪 MODO DRY-RUN: Nenhuma alteração será feita"
    fi
    
    local changes_made=0
    
    # Corrige diretório media
    if [[ -d "$MEDIA_DIR" ]]; then
        print_message $BLUE "📁 Corrigindo $MEDIA_DIR..."
        
        if [[ "$dry_run" != "--dry-run" ]]; then
            # Define proprietário
            if command -v chown >/dev/null 2>&1; then
                chown -R www-data:www-data "$MEDIA_DIR" 2>/dev/null || \
                chown -R root:root "$MEDIA_DIR" 2>/dev/null || true
            fi
            
            # Define permissões de diretórios
            find "$MEDIA_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
            
            # Define permissões de arquivos
            find "$MEDIA_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
            
            changes_made=1
        else
            print_message $BLUE "   DRY-RUN: chown -R www-data:www-data $MEDIA_DIR"
            print_message $BLUE "   DRY-RUN: find $MEDIA_DIR -type d -exec chmod 755 {} \\;"
            print_message $BLUE "   DRY-RUN: find $MEDIA_DIR -type f -exec chmod 644 {} \\;"
        fi
    fi
    
    # Corrige diretório staticfiles
    if [[ -d "$STATIC_DIR" ]]; then
        print_message $BLUE "📁 Corrigindo $STATIC_DIR..."
        
        if [[ "$dry_run" != "--dry-run" ]]; then
            # Define proprietário
            if command -v chown >/dev/null 2>&1; then
                chown -R www-data:www-data "$STATIC_DIR" 2>/dev/null || \
                chown -R root:root "$STATIC_DIR" 2>/dev/null || true
            fi
            
            # Define permissões de diretórios
            find "$STATIC_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
            
            # Define permissões de arquivos
            find "$STATIC_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
            
            changes_made=1
        else
            print_message $BLUE "   DRY-RUN: chown -R www-data:www-data $STATIC_DIR"
            print_message $BLUE "   DRY-RUN: find $STATIC_DIR -type d -exec chmod 755 {} \\;"
            print_message $BLUE "   DRY-RUN: find $STATIC_DIR -type f -exec chmod 644 {} \\;"
        fi
    fi
    
    if [[ "$changes_made" -eq 1 ]]; then
        print_message $GREEN "✅ Permissões corrigidas"
    else
        print_message $YELLOW "⚠️  Nenhuma correção necessária"
    fi
}

# Função para verificar containers Docker
check_docker_containers() {
    print_message $BLUE "🐳 Verificando containers Docker..."
    
    if command -v docker-compose >/dev/null 2>&1 && [[ -f "$COMPOSE_FILE" ]]; then
        local containers_running=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
        
        if [[ "$containers_running" -gt 0 ]]; then
            print_message $BLUE "📊 Containers rodando: $containers_running"
            
            # Verifica se os volumes estão montados corretamente
            local backend_container=$(docker-compose -f "$COMPOSE_FILE" ps -q backend 2>/dev/null || echo "")
            
            if [[ -n "$backend_container" ]]; then
                print_message $BLUE "🔍 Verificando volumes do container backend..."
                
                local volumes=$(docker inspect "$backend_container" --format='{{range .Mounts}}{{.Type}}|{{.Source}}|{{.Destination}}{{println}}{{end}}')
                
                while IFS='|' read -r type source destination; do
                    if [[ "$type" == "volume" && "$destination" == "/app/media" ]]; then
                        print_message $GREEN "✅ Volume media montado corretamente"
                    elif [[ "$type" == "volume" && "$destination" == "/app/staticfiles" ]]; then
                        print_message $GREEN "✅ Volume staticfiles montado corretamente"
                    fi
                done <<< "$volumes"
            fi
        else
            print_message $YELLOW "⚠️  Nenhum container rodando"
        fi
    else
        print_message $YELLOW "⚠️  Docker Compose não disponível"
    fi
}

# Função para testar acesso aos diretórios
test_directory_access() {
    print_message $BLUE "🧪 Testando acesso aos diretórios..."
    
    local access_issues=0
    
    # Testa acesso de leitura
    if [[ -d "$MEDIA_DIR" ]]; then
        if [[ -r "$MEDIA_DIR" ]]; then
            print_message $GREEN "✅ Acesso de leitura OK em $MEDIA_DIR"
        else
            print_message $RED "❌ Problema de acesso de leitura em $MEDIA_DIR"
            access_issues=1
        fi
    fi
    
    if [[ -d "$STATIC_DIR" ]]; then
        if [[ -r "$STATIC_DIR" ]]; then
            print_message $GREEN "✅ Acesso de leitura OK em $STATIC_DIR"
        else
            print_message $RED "❌ Problema de acesso de leitura em $STATIC_DIR"
            access_issues=1
        fi
    fi
    
    # Testa acesso de escrita (se possível)
    if [[ -d "$MEDIA_DIR" ]]; then
        local test_file="$MEDIA_DIR/.test_write_$(date +%s)"
        if touch "$test_file" 2>/dev/null; then
            print_message $GREEN "✅ Acesso de escrita OK em $MEDIA_DIR"
            rm -f "$test_file"
        else
            print_message $YELLOW "⚠️  Acesso de escrita limitado em $MEDIA_DIR"
        fi
    fi
    
    if [[ "$access_issues" -eq 0 ]]; then
        print_message $GREEN "✅ Todos os testes de acesso passaram"
        return 0
    else
        return 1
    fi
}

# Função para gerar relatório
generate_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="/tmp/permissions_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de permissões..."
    
    {
        echo "=== RELATÓRIO DE PERMISSÕES ==="
        echo "Data/Hora: $(date)"
        echo ""
        echo "=== PERMISSÕES ATUAIS ==="
        if [[ -d "$MEDIA_DIR" ]]; then
            echo "--- $MEDIA_DIR ---"
            ls -la "$MEDIA_DIR"
            echo ""
        fi
        if [[ -d "$STATIC_DIR" ]]; then
            echo "--- $STATIC_DIR ---"
            ls -la "$STATIC_DIR"
            echo ""
        fi
        echo "=== CONTAINERS DOCKER ==="
        if command -v docker-compose >/dev/null 2>&1 && [[ -f "$COMPOSE_FILE" ]]; then
            docker-compose -f "$COMPOSE_FILE" ps
        else
            echo "Docker Compose não disponível"
        fi
        echo ""
        echo "=== RECOMENDAÇÕES ==="
        echo "1. Diretórios devem ter permissão 755"
        echo "2. Arquivos devem ter permissão 644"
        echo "3. Proprietário deve ser www-data ou root"
        echo "4. Verifique se os volumes Docker estão montados corretamente"
        echo "5. Teste o acesso após correções"
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO VERIFICAÇÃO E CORREÇÃO DE PERMISSÕES"
    echo
    
    # Verificações iniciais
    check_dependencies
    echo
    
    # Backup das permissões atuais
    backup_current_permissions "$@"
    echo
    
    # Verifica permissões atuais
    check_current_permissions
    echo
    
    # Verifica containers Docker
    check_docker_containers
    echo
    
    # Corrige permissões se necessário
    fix_permissions "$@"
    echo
    
    # Testa acesso após correções
    test_directory_access
    echo
    
    # Gera relatório
    generate_report
    echo
    
    print_message $GREEN "✅ VERIFICAÇÃO DE PERMISSÕES CONCLUÍDA!"
    print_message $BLUE "💡 Se houver problemas, verifique os logs do Django/Nginx"
}

# Executa o script
main "$@" 