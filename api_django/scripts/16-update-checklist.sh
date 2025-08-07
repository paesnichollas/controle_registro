#!/bin/bash

# =============================================================================
# SCRIPT: 16-update-checklist.sh
# DESCRIÇÃO: Checklist de atualização segura com backup, deploy e validação
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./16-update-checklist.sh [--auto] [--rollback] [--validate]
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/backups"
LOG_FILE="/var/log/update_checklist.log"
ROLLBACK_POINT=""

# Endpoints para validação
VALIDATION_ENDPOINTS=(
    "http://localhost:8000/admin/"
    "http://localhost/"
    "http://localhost:8000/api/"
)

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para log
log_message() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> "$LOG_FILE"
}

# Função para verificar dependências
check_dependencies() {
    print_message $BLUE "🔍 Verificando dependências..."
    
    # Verifica Docker
    if ! command -v docker >/dev/null 2>&1; then
        print_message $RED "ERRO: Docker não está instalado"
        exit 1
    fi
    
    # Verifica docker-compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_message $RED "ERRO: docker-compose não está instalado"
        exit 1
    fi
    
    # Verifica git
    if ! command -v git >/dev/null 2>&1; then
        print_message $RED "ERRO: Git não está instalado"
        exit 1
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para verificar status atual
check_current_status() {
    print_message $BLUE "📊 Verificando status atual..."
    
    # Verifica se há containers rodando
    local running_containers=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
    
    if [[ "$running_containers" -eq 0 ]]; then
        print_message $YELLOW "⚠️  Nenhum container rodando"
        return 1
    else
        print_message $GREEN "✅ $running_containers containers rodando"
    fi
    
    # Verifica espaço em disco
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    if [[ "$disk_usage" -gt 90 ]]; then
        print_message $RED "🚨 ALERTA: Disco quase cheio ($disk_usage%)"
        return 1
    fi
    
    # Verifica conectividade de rede
    if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        print_message $RED "🚨 ALERTA: Problema de conectividade de rede"
        return 1
    fi
    
    print_message $GREEN "✅ Status atual OK"
    return 0
}

# Função para fazer backup antes da atualização
create_pre_update_backup() {
    print_message $BLUE "💾 Criando backup antes da atualização..."
    
    # Executa backup completo
    if [[ -f "scripts/02-backup-all.sh" ]]; then
        if ./scripts/02-backup-all.sh; then
            print_message $GREEN "✅ Backup pré-atualização criado"
            log_message "Backup pré-atualização criado com sucesso"
        else
            print_message $RED "❌ Falha no backup pré-atualização"
            return 1
        fi
    else
        print_message $YELLOW "⚠️  Script de backup não encontrado"
    fi
    
    # Salva estado atual dos containers
    docker-compose -f "$COMPOSE_FILE" ps > "/tmp/pre_update_containers_$(date +%Y%m%d_%H%M%S).txt"
    
    # Salva logs atuais
    docker-compose -f "$COMPOSE_FILE" logs > "/tmp/pre_update_logs_$(date +%Y%m%d_%H%M%S).txt"
}

# Função para parar containers
stop_containers() {
    print_message $BLUE "🛑 Parando containers..."
    
    if docker-compose -f "$COMPOSE_FILE" down; then
        print_message $GREEN "✅ Containers parados"
        log_message "Containers parados com sucesso"
    else
        print_message $RED "❌ Falha ao parar containers"
        return 1
    fi
}

# Função para atualizar código
update_code() {
    print_message $BLUE "📥 Atualizando código..."
    
    # Verifica se há mudanças não commitadas
    if [[ -n "$(git status --porcelain)" ]]; then
        print_message $YELLOW "⚠️  Há mudanças não commitadas:"
        git status --porcelain
        read -p "Deseja continuar? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_message $YELLOW "Atualização cancelada pelo usuário"
            return 1
        fi
    fi
    
    # Salva commit atual para rollback
    ROLLBACK_POINT=$(git rev-parse HEAD)
    print_message $BLUE "📌 Ponto de rollback: $ROLLBACK_POINT"
    
    # Puxa atualizações
    if git pull origin main; then
        print_message $GREEN "✅ Código atualizado"
        log_message "Código atualizado com sucesso"
    else
        print_message $RED "❌ Falha ao atualizar código"
        return 1
    fi
}

# Função para reconstruir imagens
rebuild_images() {
    print_message $BLUE "🔨 Reconstruindo imagens..."
    
    if docker-compose -f "$COMPOSE_FILE" build --no-cache; then
        print_message $GREEN "✅ Imagens reconstruídas"
        log_message "Imagens reconstruídas com sucesso"
    else
        print_message $RED "❌ Falha ao reconstruir imagens"
        return 1
    fi
}

# Função para subir containers
start_containers() {
    print_message $BLUE "🚀 Subindo containers..."
    
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        print_message $GREEN "✅ Containers iniciados"
        log_message "Containers iniciados com sucesso"
    else
        print_message $RED "❌ Falha ao iniciar containers"
        return 1
    fi
    
    # Aguarda containers estarem prontos
    print_message $BLUE "⏳ Aguardando containers estarem prontos..."
    sleep 30
}

# Função para validar endpoints
validate_endpoints() {
    print_message $BLUE "🧪 Validando endpoints..."
    
    local validation_failed=0
    
    for endpoint in "${VALIDATION_ENDPOINTS[@]}"; do
        print_message $BLUE "Testando: $endpoint"
        
        # Tenta várias vezes
        local attempts=0
        local max_attempts=5
        
        while [[ $attempts -lt $max_attempts ]]; do
            if curl -f -s "$endpoint" >/dev/null 2>&1; then
                print_message $GREEN "✅ $endpoint - OK"
                break
            else
                attempts=$((attempts + 1))
                if [[ $attempts -eq $max_attempts ]]; then
                    print_message $RED "❌ $endpoint - FALHOU após $max_attempts tentativas"
                    validation_failed=1
                else
                    print_message $YELLOW "⚠️  Tentativa $attempts/$max_attempts falhou, tentando novamente..."
                    sleep 5
                fi
            fi
        done
    done
    
    # Verifica logs por erros
    local error_logs=$(docker-compose -f "$COMPOSE_FILE" logs --tail=50 2>&1 | grep -i "error\|exception\|fatal" | wc -l)
    if [[ "$error_logs" -gt 5 ]]; then
        print_message $YELLOW "⚠️  Muitos erros nos logs: $error_logs"
        validation_failed=1
    fi
    
    if [[ "$validation_failed" -eq 0 ]]; then
        print_message $GREEN "✅ Todos os endpoints validados"
        log_message "Validação de endpoints bem-sucedida"
        return 0
    else
        print_message $RED "❌ Falha na validação de endpoints"
        log_message "Falha na validação de endpoints"
        return 1
    fi
}

# Função para rollback
perform_rollback() {
    if [[ "${2:-}" == "--rollback" && -n "$ROLLBACK_POINT" ]]; then
        print_message $BLUE "🔄 Executando rollback..."
        
        # Para containers
        docker-compose -f "$COMPOSE_FILE" down
        
        # Volta para o commit anterior
        if git reset --hard "$ROLLBACK_POINT"; then
            print_message $GREEN "✅ Código revertido para: $ROLLBACK_POINT"
        else
            print_message $RED "❌ Falha ao reverter código"
            return 1
        fi
        
        # Reconstrói e sobe containers
        if docker-compose -f "$COMPOSE_FILE" build && docker-compose -f "$COMPOSE_FILE" up -d; then
            print_message $GREEN "✅ Rollback concluído"
            log_message "Rollback executado com sucesso"
        else
            print_message $RED "❌ Falha no rollback"
            return 1
        fi
    fi
}

# Função para validação pós-atualização
post_update_validation() {
    if [[ "${3:-}" == "--validate" ]]; then
        print_message $BLUE "🔍 Validação pós-atualização..."
        
        # Verifica se todos os containers estão rodando
        local expected_containers=("db" "backend" "frontend")
        local running_containers=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running")
        
        for container in "${expected_containers[@]}"; do
            if echo "$running_containers" | grep -q "$container"; then
                print_message $GREEN "✅ Container $container rodando"
            else
                print_message $RED "❌ Container $container não está rodando"
                return 1
            fi
        done
        
        # Testa conectividade do banco
        if docker-compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d controle_os -c "SELECT 1;" >/dev/null 2>&1; then
            print_message $GREEN "✅ Conexão com banco OK"
        else
            print_message $RED "❌ Problema na conexão com banco"
            return 1
        fi
        
        # Verifica logs por erros críticos
        local critical_errors=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>&1 | grep -i "critical\|fatal\|panic" | wc -l)
        if [[ "$critical_errors" -gt 0 ]]; then
            print_message $RED "❌ Erros críticos encontrados: $critical_errors"
            return 1
        fi
        
        print_message $GREEN "✅ Validação pós-atualização OK"
        return 0
    fi
}

# Função para gerar relatório
generate_update_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="/tmp/update_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de atualização..."
    
    {
        echo "=== RELATÓRIO DE ATUALIZAÇÃO ==="
        echo "Data/Hora: $(date)"
        echo "Commit anterior: $ROLLBACK_POINT"
        echo "Commit atual: $(git rev-parse HEAD)"
        echo ""
        echo "=== STATUS DOS CONTAINERS ==="
        docker-compose -f "$COMPOSE_FILE" ps
        echo ""
        echo "=== LOGS RECENTES ==="
        docker-compose -f "$COMPOSE_FILE" logs --tail=20
        echo ""
        echo "=== ESPAÇO EM DISCO ==="
        df -h
        echo ""
        echo "=== VALIDAÇÃO DE ENDPOINTS ==="
        for endpoint in "${VALIDATION_ENDPOINTS[@]}"; do
            if curl -f -s "$endpoint" >/dev/null 2>&1; then
                echo "✅ $endpoint"
            else
                echo "❌ $endpoint"
            fi
        done
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função para modo automático
auto_update() {
    if [[ "${1:-}" == "--auto" ]]; then
        print_message $BLUE "🤖 MODO AUTOMÁTICO ATIVADO"
        
        # Executa todas as etapas automaticamente
        check_current_status || exit 1
        create_pre_update_backup || exit 1
        stop_containers || exit 1
        update_code || exit 1
        rebuild_images || exit 1
        start_containers || exit 1
        validate_endpoints || exit 1
        post_update_validation "$@" || exit 1
        generate_update_report
        
        print_message $GREEN "✅ ATUALIZAÇÃO AUTOMÁTICA CONCLUÍDA!"
    fi
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO CHECKLIST DE ATUALIZAÇÃO SEGURA"
    echo
    
    # Verificações iniciais
    check_dependencies
    echo
    
    # Modo automático
    auto_update "$@"
    
    if [[ "${1:-}" != "--auto" ]]; then
        # Modo interativo
        print_message $BLUE "📋 CHECKLIST DE ATUALIZAÇÃO:"
        echo
        echo "1. ✅ Verificar dependências"
        echo "2. 📊 Verificar status atual"
        echo "3. 💾 Fazer backup pré-atualização"
        echo "4. 🛑 Parar containers"
        echo "5. 📥 Atualizar código"
        echo "6. 🔨 Reconstruir imagens"
        echo "7. 🚀 Subir containers"
        echo "8. 🧪 Validar endpoints"
        echo "9. 🔍 Validação pós-atualização"
        echo "10. 📊 Gerar relatório"
        echo
        
        read -p "Deseja executar o checklist completo? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            check_current_status
            echo
            create_pre_update_backup
            echo
            stop_containers
            echo
            update_code
            echo
            rebuild_images
            echo
            start_containers
            echo
            validate_endpoints
            echo
            post_update_validation "$@"
            echo
            generate_update_report
            echo
            
            print_message $GREEN "✅ CHECKLIST DE ATUALIZAÇÃO CONCLUÍDO!"
        else
            print_message $YELLOW "Checklist cancelado pelo usuário"
        fi
    fi
    
    # Rollback se solicitado
    perform_rollback "$@"
}

# Executa o script
main "$@" 