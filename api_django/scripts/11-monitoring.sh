#!/bin/bash

# =============================================================================
# SCRIPT: 11-monitoring.sh
# DESCRIÇÃO: Monitoramento de serviços e alertas por e-mail/Telegram
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./11-monitoring.sh [--email] [--telegram] [--cron]
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
LOG_FILE="/var/log/monitoring.log"
ALERT_LOG="/var/log/alerts.log"

# Limites de alerta
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
CONTAINER_RESTART_THRESHOLD=3

# Configurações de notificação
EMAIL_TO="admin@example.com"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

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

# Função para log de alerta
log_alert() {
    local alert="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERTA: $alert" >> "$ALERT_LOG"
    print_message $RED "🚨 ALERTA: $alert"
}

# Função para verificar dependências
check_dependencies() {
    print_message $BLUE "🔍 Verificando dependências..."
    
    # Verifica Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_alert "Docker não está instalado"
        exit 1
    fi
    
    # Verifica docker-compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_alert "docker-compose não está instalado"
        exit 1
    fi
    
    # Verifica curl para notificações
    if ! command -v curl >/dev/null 2>&1; then
        print_message $YELLOW "⚠️  curl não está instalado, notificações podem falhar"
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para verificar containers essenciais
check_containers() {
    print_message $BLUE "🐳 Verificando containers essenciais..."
    
    local essential_containers=("db" "backend" "frontend")
    local failed_containers=()
    
    for container in "${essential_containers[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$container" | grep -q "Up"; then
            print_message $GREEN "✅ Container $container está rodando"
            log_message "Container $container: OK"
        else
            print_message $RED "❌ Container $container NÃO está rodando"
            log_alert "Container $container parado"
            failed_containers+=("$container")
        fi
    done
    
    # Verifica restart count
    for container in "${essential_containers[@]}"; do
        local restart_count=$(docker inspect "$(docker-compose -f "$COMPOSE_FILE" ps -q "$container")" --format='{{.RestartCount}}' 2>/dev/null || echo "0")
        if [[ "$restart_count" -gt "$CONTAINER_RESTART_THRESHOLD" ]]; then
            log_alert "Container $container reiniciado $restart_count vezes"
        fi
    done
    
    if [[ ${#failed_containers[@]} -gt 0 ]]; then
        return 1
    fi
}

# Função para verificar uso de CPU
check_cpu_usage() {
    print_message $BLUE "🖥️  Verificando uso de CPU..."
    
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local cpu_usage_int=${cpu_usage%.*}
    
    print_message $BLUE "📊 Uso de CPU: ${cpu_usage}%"
    log_message "CPU: ${cpu_usage}%"
    
    if [[ "$cpu_usage_int" -gt "$CPU_THRESHOLD" ]]; then
        log_alert "Uso de CPU alto: ${cpu_usage}%"
        return 1
    fi
}

# Função para verificar uso de memória
check_memory_usage() {
    print_message $BLUE "🧠 Verificando uso de memória..."
    
    local memory_info=$(free -m | grep Mem)
    local total_memory=$(echo "$memory_info" | awk '{print $2}')
    local used_memory=$(echo "$memory_info" | awk '{print $3}')
    local memory_percent=$((used_memory * 100 / total_memory))
    
    print_message $BLUE "📊 Uso de memória: ${memory_percent}% (${used_memory}MB/${total_memory}MB)"
    log_message "Memória: ${memory_percent}%"
    
    if [[ "$memory_percent" -gt "$MEMORY_THRESHOLD" ]]; then
        log_alert "Uso de memória alto: ${memory_percent}%"
        return 1
    fi
}

# Função para verificar uso de disco
check_disk_usage() {
    print_message $BLUE "💾 Verificando uso de disco..."
    
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    
    print_message $BLUE "📊 Uso de disco: ${disk_usage}%"
    log_message "Disco: ${disk_usage}%"
    
    if [[ "$disk_usage" -gt "$DISK_THRESHOLD" ]]; then
        log_alert "Uso de disco alto: ${disk_usage}%"
        return 1
    fi
}

# Função para verificar conectividade de rede
check_network() {
    print_message $BLUE "🌐 Verificando conectividade de rede..."
    
    # Testa conectividade com DNS
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        print_message $GREEN "✅ Conectividade de rede OK"
        log_message "Rede: OK"
    else
        log_alert "Problema de conectividade de rede"
        return 1
    fi
}

# Função para verificar endpoints da aplicação
check_endpoints() {
    print_message $BLUE "🔗 Verificando endpoints da aplicação..."
    
    local endpoints=(
        "http://localhost:8000/admin/"
        "http://localhost/"
        "http://localhost:8000/api/"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" >/dev/null 2>&1; then
            print_message $GREEN "✅ $endpoint - OK"
            log_message "Endpoint $endpoint: OK"
        else
            print_message $RED "❌ $endpoint - FALHOU"
            log_message "Endpoint $endpoint: FALHOU"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_alert "Endpoints falharam: ${failed_endpoints[*]}"
        return 1
    fi
}

# Função para verificar logs de erro
check_error_logs() {
    print_message $BLUE "📋 Verificando logs de erro..."
    
    local error_count=0
    
    # Verifica logs do Django
    if [[ -f "django.log" ]]; then
        local django_errors=$(tail -n 100 django.log | grep -i "error\|exception\|traceback" | wc -l)
        if [[ "$django_errors" -gt 10 ]]; then
            log_alert "Muitos erros no log do Django: $django_errors"
            error_count=$((error_count + 1))
        fi
    fi
    
    # Verifica logs dos containers
    local container_errors=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>&1 | grep -i "error\|exception\|fatal" | wc -l)
    if [[ "$container_errors" -gt 5 ]]; then
        log_alert "Muitos erros nos logs dos containers: $container_errors"
        error_count=$((error_count + 1))
    fi
    
    if [[ "$error_count" -eq 0 ]]; then
        print_message $GREEN "✅ Logs de erro OK"
        log_message "Logs de erro: OK"
    fi
}

# Função para enviar notificação por e-mail
send_email_alert() {
    if [[ "${1:-}" == "--email" ]]; then
        local subject="ALERTA: Monitoramento do Sistema"
        local body="Alerta detectado no sistema em $(date)"
        
        if command -v mail >/dev/null 2>&1; then
            echo "$body" | mail -s "$subject" "$EMAIL_TO"
            print_message $GREEN "✅ Alerta enviado por e-mail"
        else
            print_message $YELLOW "⚠️  mail não está instalado"
        fi
    fi
}

# Função para enviar notificação por Telegram
send_telegram_alert() {
    if [[ "${2:-}" == "--telegram" && -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
        local message="🚨 ALERTA: Problema detectado no sistema em $(date)"
        
        curl -s -X POST \
            "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=$message" \
            -d "parse_mode=HTML" >/dev/null 2>&1
        
        print_message $GREEN "✅ Alerta enviado por Telegram"
    fi
}

# Função para gerar relatório de status
generate_status_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="/tmp/status_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de status..."
    
    {
        echo "=== RELATÓRIO DE STATUS DO SISTEMA ==="
        echo "Data/Hora: $(date)"
        echo "Sistema: $(uname -a)"
        echo ""
        echo "=== CONTAINERS ==="
        docker-compose -f "$COMPOSE_FILE" ps
        echo ""
        echo "=== RECURSOS DO SISTEMA ==="
        echo "CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')"
        echo "Memória: $(free -h | grep Mem | awk '{print $3"/"$2}')"
        echo "Disco: $(df -h / | awk 'NR==2 {print $3"/"$2" ("$5")"}')"
        echo ""
        echo "=== ÚLTIMOS LOGS ==="
        docker-compose -f "$COMPOSE_FILE" logs --tail=20
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função para configurar monitoramento contínuo
setup_continuous_monitoring() {
    if [[ "${3:-}" == "--cron" ]]; then
        print_message $BLUE "⏰ Configurando monitoramento contínuo..."
        
        # Cria entrada no crontab para executar a cada 5 minutos
        local cron_entry="*/5 * * * * cd $(pwd) && ./scripts/04-monitoring.sh --email --telegram >> /var/log/monitoring_cron.log 2>&1"
        
        # Adiciona ao crontab se não existir
        if ! crontab -l 2>/dev/null | grep -q "04-monitoring.sh"; then
            (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
            print_message $GREEN "✅ Monitoramento contínuo configurado (a cada 5 minutos)"
        else
            print_message $YELLOW "⚠️  Monitoramento contínuo já configurado"
        fi
    fi
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO MONITORAMENTO DO SISTEMA"
    echo
    
    # Verificações iniciais
    check_dependencies
    
    # Executa verificações
    local overall_status=0
    
    check_containers || overall_status=1
    echo
    check_cpu_usage || overall_status=1
    echo
    check_memory_usage || overall_status=1
    echo
    check_disk_usage || overall_status=1
    echo
    check_network || overall_status=1
    echo
    check_endpoints || overall_status=1
    echo
    check_error_logs || overall_status=1
    echo
    
    # Envia notificações se houver problemas
    if [[ "$overall_status" -eq 1 ]]; then
        send_email_alert "$@"
        send_telegram_alert "$@"
    fi
    
    # Gera relatório
    generate_status_report
    echo
    
    # Configura monitoramento contínuo
    setup_continuous_monitoring "$@"
    
    if [[ "$overall_status" -eq 0 ]]; then
        print_message $GREEN "✅ TODOS OS CHECKS PASSARAM!"
        log_message "Monitoramento: TODOS OS CHECKS PASSARAM"
    else
        print_message $RED "❌ ALGUNS CHECKS FALHARAM!"
        log_message "Monitoramento: ALGUNS CHECKS FALHARAM"
    fi
}

# Executa o script
main "$@" 