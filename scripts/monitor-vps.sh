#!/bin/bash

# Script de monitoramento para VPS Hostinger
# Controle Registro - Monorepo

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Controle Registro - Monitoramento${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar recursos do sistema
check_system_resources() {
    print_message "Verificando recursos do sistema..."
    echo ""
    
    # CPU
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    echo "  🖥️  CPU: ${CPU_USAGE}%"
    
    # Memória
    MEMORY_INFO=$(free -h | grep Mem)
    MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')
    MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_FREE=$(echo $MEMORY_INFO | awk '{print $4}')
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    echo "  💾 Memória: ${MEMORY_USED}/${MEMORY_TOTAL} (${MEMORY_USAGE}%)"
    
    # Disco
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
    DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
    DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
    DISK_AVAIL=$(df -h / | tail -1 | awk '{print $4}')
    echo "  💿 Disco: ${DISK_USED}/${DISK_TOTAL} (${DISK_USAGE})"
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "  📊 Load Average: $LOAD_AVG"
    echo ""
    
    # Alertas
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        print_warning "⚠️ CPU com uso alto: ${CPU_USAGE}%"
    fi
    
    if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
        print_warning "⚠️ Memória com uso alto: ${MEMORY_USAGE}%"
    fi
    
    DISK_PERCENT=$(echo $DISK_USAGE | sed 's/%//')
    if [ "$DISK_PERCENT" -gt 80 ]; then
        print_warning "⚠️ Disco com uso alto: ${DISK_USAGE}"
    fi
}

# Verificar status dos containers Docker
check_docker_containers() {
    print_message "Verificando containers Docker..."
    echo ""
    
    if docker-compose -f docker-compose.vps.yml ps --format table > /dev/null 2>&1; then
        docker-compose -f docker-compose.vps.yml ps --format table
        echo ""
        
        # Verificar containers que não estão rodando
        STOPPED_CONTAINERS=$(docker-compose -f docker-compose.vps.yml ps --filter "status=exited" --format "table {{.Name}}\t{{.Status}}")
        if [ ! -z "$STOPPED_CONTAINERS" ]; then
            print_warning "⚠️ Containers parados:"
            echo "$STOPPED_CONTAINERS"
            echo ""
        fi
    else
        print_error "❌ Erro ao verificar containers Docker"
    fi
}

# Verificar saúde dos serviços
check_service_health() {
    print_message "Verificando saúde dos serviços..."
    echo ""
    
    # Backend
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "  ✅ Backend (Django): Saudável"
    else
        echo "  ❌ Backend (Django): Não está respondendo"
    fi
    
    # Frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        echo "  ✅ Frontend (React): Saudável"
    else
        echo "  ❌ Frontend (React): Não está respondendo"
    fi
    
    # Nginx
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo "  ✅ Nginx: Saudável"
    else
        echo "  ❌ Nginx: Não está respondendo"
    fi
    
    # PostgreSQL
    if docker-compose -f docker-compose.vps.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL: Saudável"
    else
        echo "  ❌ PostgreSQL: Não está respondendo"
    fi
    
    # Redis
    if docker-compose -f docker-compose.vps.yml exec -T redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d'=' -f2) ping > /dev/null 2>&1; then
        echo "  ✅ Redis: Saudável"
    else
        echo "  ❌ Redis: Não está respondendo"
    fi
    
    echo ""
}

# Verificar logs de erro
check_error_logs() {
    print_message "Verificando logs de erro..."
    echo ""
    
    # Logs do Django
    if [ -f "logs/django.log" ]; then
        DJANGO_ERRORS=$(tail -20 logs/django.log | grep -i "error\|exception\|traceback" | wc -l)
        echo "  📋 Django errors (últimas 20 linhas): $DJANGO_ERRORS"
    fi
    
    # Logs do Nginx
    if [ -f "logs/nginx/error.log" ]; then
        NGINX_ERRORS=$(tail -20 logs/nginx/error.log | grep -v "favicon.ico" | wc -l)
        echo "  📋 Nginx errors (últimas 20 linhas): $NGINX_ERRORS"
    fi
    
    # Logs do Docker
    DOCKER_ERRORS=$(docker-compose -f docker-compose.vps.yml logs --tail=50 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    echo "  📋 Docker errors (últimas 50 linhas): $DOCKER_ERRORS"
    
    echo ""
}

# Verificar conectividade de rede
check_network() {
    print_message "Verificando conectividade de rede..."
    echo ""
    
    # Verificar conectividade externa
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        echo "  ✅ Conectividade externa: OK"
    else
        echo "  ❌ Conectividade externa: Falha"
    fi
    
    # Verificar DNS
    if nslookup google.com > /dev/null 2>&1; then
        echo "  ✅ DNS: OK"
    else
        echo "  ❌ DNS: Falha"
    fi
    
    # Verificar portas abertas
    echo "  🔍 Portas abertas:"
    netstat -tlnp 2>/dev/null | grep -E ':(80|443|8000|5432|6379)' | while read line; do
        echo "    📡 $line"
    done
    
    echo ""
}

# Verificar certificados SSL
check_ssl_certificates() {
    print_message "Verificando certificados SSL..."
    echo ""
    
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        CERT_EXPIRY=$(openssl x509 -in ssl/cert.pem -noout -enddate | cut -d= -f2)
        echo "  🔒 Certificado SSL expira em: $CERT_EXPIRY"
        
        # Verificar se está próximo do vencimento (30 dias)
        EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
        CURRENT_DATE=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))
        
        if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
            print_warning "⚠️ Certificado SSL expira em $DAYS_UNTIL_EXPIRY dias"
        fi
    else
        print_warning "⚠️ Certificados SSL não encontrados"
    fi
    
    echo ""
}

# Verificar backups
check_backups() {
    print_message "Verificando backups..."
    echo ""
    
    if [ -d "backups" ]; then
        BACKUP_COUNT=$(find backups/ -name "backup_*" -type f | wc -l)
        echo "  📦 Total de backups: $BACKUP_COUNT"
        
        if [ $BACKUP_COUNT -gt 0 ]; then
            LATEST_BACKUP=$(find backups/ -name "backup_*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
            LATEST_BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1)
            echo "  📅 Último backup: $LATEST_BACKUP_DATE"
            
            # Verificar se o último backup é recente (menos de 24h)
            BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
            if [ $BACKUP_AGE -gt 24 ]; then
                print_warning "⚠️ Último backup é antigo ($BACKUP_AGE horas)"
            fi
        fi
    else
        print_warning "⚠️ Diretório de backups não encontrado"
    fi
    
    echo ""
}

# Verificar segurança
check_security() {
    print_message "Verificando configurações de segurança..."
    echo ""
    
    # Verificar se o firewall está ativo
    if command -v ufw > /dev/null 2>&1; then
        UFW_STATUS=$(ufw status | head -1)
        echo "  🔥 Firewall: $UFW_STATUS"
    else
        echo "  🔥 Firewall: UFW não disponível"
    fi
    
    # Verificar tentativas de login SSH
    SSH_FAILURES=$(grep "Failed password" /var/log/auth.log 2>/dev/null | tail -10 | wc -l)
    echo "  🔐 Falhas de login SSH (últimas 10): $SSH_FAILURES"
    
    # Verificar processos suspeitos
    SUSPICIOUS_PROCESSES=$(ps aux | grep -E "(python|node|nginx)" | grep -v grep | wc -l)
    echo "  🔍 Processos da aplicação ativos: $SUSPICIOUS_PROCESSES"
    
    echo ""
}

# Gerar relatório
generate_report() {
    print_message "Gerando relatório de monitoramento..."
    
    REPORT_FILE="monitoring_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== RELATÓRIO DE MONITORAMENTO ==="
        echo "Data: $(date)"
        echo "Hostname: $(hostname)"
        echo ""
        
        echo "=== RECURSOS DO SISTEMA ==="
        echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo "Memória: $(free -h | grep Mem | awk '{print $3"/"$2" ("$3/$2*100.0"%)"}')"
        echo "Disco: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}')"
        echo ""
        
        echo "=== STATUS DOS SERVIÇOS ==="
        docker-compose -f docker-compose.vps.yml ps --format table
        echo ""
        
        echo "=== LOGS DE ERRO ==="
        echo "Django errors: $(tail -20 logs/django.log 2>/dev/null | grep -i "error\|exception" | wc -l)"
        echo "Nginx errors: $(tail -20 logs/nginx/error.log 2>/dev/null | grep -v "favicon.ico" | wc -l)"
        echo ""
        
    } > "logs/$REPORT_FILE"
    
    print_message "Relatório salvo em: logs/$REPORT_FILE"
}

# Função principal
main() {
    print_header
    
    check_system_resources
    check_docker_containers
    check_service_health
    check_error_logs
    check_network
    check_ssl_certificates
    check_backups
    check_security
    generate_report
    
    print_message "Monitoramento concluído! 🎉"
}

# Executar função principal
main "$@"
