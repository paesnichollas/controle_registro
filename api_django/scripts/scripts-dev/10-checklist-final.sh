#!/bin/bash

# =============================================================================
# SCRIPT: 10-checklist-final.sh
# DESCRIÇÃO: Checklist final automatizado para verificar todos os itens
# USO: ./10-checklist-final.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./10-checklist-final.sh [dev|prod]"
    exit 1
fi

echo "📋 CHECKLIST FINAL AUTOMATIZADO - AMBIENTE $ENVIRONMENT..."
echo "=========================================================="

# Definir arquivo compose baseado no ambiente
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    FRONTEND_URL="http://localhost:5173"
    BACKEND_URL="http://localhost:8000"
else
    COMPOSE_FILE="docker-compose.yml"
    FRONTEND_URL="http://localhost"
    BACKEND_URL="http://localhost:8000"
fi

# Arrays para armazenar resultados
PASSED_CHECKS=()
FAILED_CHECKS=()
WARNING_CHECKS=()

# Função para adicionar resultado
add_result() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            PASSED_CHECKS+=("$message")
            echo "✅ $message"
            ;;
        "FAIL")
            FAILED_CHECKS+=("$message")
            echo "❌ $message"
            ;;
        "WARN")
            WARNING_CHECKS+=("$message")
            echo "⚠️  $message"
            ;;
    esac
}

# Função para testar URL
test_url() {
    local url=$1
    local description=$2
    local timeout=10
    
    if curl -s --max-time $timeout "$url" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo ""
echo "🔍 INICIANDO VERIFICAÇÕES..."
echo "============================="

# 1. VERIFICAÇÕES DE INFRAESTRUTURA
echo ""
echo "🏗️  VERIFICAÇÕES DE INFRAESTRUTURA"
echo "=================================="

# Docker instalado
if command -v docker &> /dev/null; then
    add_result "PASS" "Docker instalado"
else
    add_result "FAIL" "Docker não instalado"
fi

# Docker Compose instalado
if command -v docker-compose &> /dev/null; then
    add_result "PASS" "Docker Compose instalado"
else
    add_result "FAIL" "Docker Compose não instalado"
fi

# Docker funcionando
if docker info >/dev/null 2>&1; then
    add_result "PASS" "Docker funcionando"
else
    add_result "FAIL" "Docker não funcionando"
fi

# Arquivo compose existe
if [ -f "$COMPOSE_FILE" ]; then
    add_result "PASS" "Arquivo $COMPOSE_FILE existe"
else
    add_result "FAIL" "Arquivo $COMPOSE_FILE não existe"
fi

# 2. VERIFICAÇÕES DE CONFIGURAÇÃO
echo ""
echo "🔧 VERIFICAÇÕES DE CONFIGURAÇÃO"
echo "================================"

# Arquivo .env existe
if [ -f ".env" ]; then
    add_result "PASS" "Arquivo .env existe"
else
    add_result "FAIL" "Arquivo .env não existe"
fi

# Variáveis críticas configuradas
if [ -f ".env" ]; then
    critical_vars=("SECRET_KEY" "POSTGRES_PASSWORD" "DJANGO_SUPERUSER_PASSWORD")
    for var in "${critical_vars[@]}"; do
        if grep -q "^$var=" .env; then
            value=$(grep "^$var=" .env | cut -d'=' -f2)
            if [ -n "$value" ] && [ "$value" != "your-secret-key-here-change-in-production" ]; then
                add_result "PASS" "$var configurada"
            else
                add_result "WARN" "$var precisa ser configurada"
            fi
        else
            add_result "FAIL" "$var não encontrada"
        fi
    done
fi

# Certificados SSL
if [ -f "nginx/ssl/nginx.crt" ] && [ -f "nginx/ssl/nginx.key" ]; then
    add_result "PASS" "Certificados SSL existem"
else
    add_result "WARN" "Certificados SSL não encontrados"
fi

# 3. VERIFICAÇÕES DE CONTAINERS
echo ""
echo "📦 VERIFICAÇÕES DE CONTAINERS"
echo "=============================="

# Containers rodando
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    add_result "PASS" "Containers estão rodando"
else
    add_result "FAIL" "Containers não estão rodando"
fi

# Verificar cada serviço
services=$(docker-compose -f "$COMPOSE_FILE" config --services)
for service in $services; do
    if docker-compose -f "$COMPOSE_FILE" ps -q "$service" >/dev/null 2>&1; then
        container_status=$(docker inspect --format='{{.State.Status}}' "$(docker-compose -f "$COMPOSE_FILE" ps -q "$service")" 2>/dev/null || echo "unknown")
        if [ "$container_status" = "running" ]; then
            add_result "PASS" "Serviço $service está rodando"
        else
            add_result "FAIL" "Serviço $service não está rodando ($container_status)"
        fi
    else
        add_result "FAIL" "Serviço $service não encontrado"
    fi
done

# 4. VERIFICAÇÕES DE CONECTIVIDADE
echo ""
echo "🌐 VERIFICAÇÕES DE CONECTIVIDADE"
echo "================================"

# Frontend acessível
if test_url "$FRONTEND_URL" "Frontend"; then
    add_result "PASS" "Frontend acessível"
else
    add_result "FAIL" "Frontend não acessível"
fi

# Backend acessível
if test_url "$BACKEND_URL" "Backend"; then
    add_result "PASS" "Backend acessível"
else
    add_result "FAIL" "Backend não acessível"
fi

# Admin Django acessível
if test_url "$BACKEND_URL/admin" "Admin Django"; then
    add_result "PASS" "Admin Django acessível"
else
    add_result "FAIL" "Admin Django não acessível"
fi

# 5. VERIFICAÇÕES DE BANCO DE DADOS
echo ""
echo "🗄️  VERIFICAÇÕES DE BANCO DE DADOS"
echo "==================================="

# Banco acessível
if docker-compose -f "$COMPOSE_FILE" ps -q db >/dev/null 2>&1; then
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
        add_result "PASS" "Banco de dados acessível"
    else
        add_result "FAIL" "Banco de dados não acessível"
    fi
else
    add_result "FAIL" "Container do banco não encontrado"
fi

# Migrações aplicadas
if docker-compose -f "$COMPOSE_FILE" ps -q backend >/dev/null 2>&1; then
    if docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py showmigrations --list | grep -q "\[X\]"; then
        add_result "PASS" "Migrações aplicadas"
    else
        add_result "WARN" "Migrações não aplicadas"
    fi
else
    add_result "FAIL" "Container backend não encontrado"
fi

# 6. VERIFICAÇÕES DE BACKUP
echo ""
echo "💾 VERIFICAÇÕES DE BACKUP"
echo "=========================="

# Diretório de backup existe
backup_dir="backups/$ENVIRONMENT"
if [ -d "$backup_dir" ]; then
    add_result "PASS" "Diretório de backup existe"
else
    add_result "WARN" "Diretório de backup não existe"
fi

# Backups existem
if [ -d "$backup_dir" ]; then
    backup_count=$(ls -1 "$backup_dir"/*_complete.tar.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 0 ]; then
        add_result "PASS" "$backup_count backup(s) encontrado(s)"
    else
        add_result "WARN" "Nenhum backup encontrado"
    fi
else
    add_result "WARN" "Não foi possível verificar backups"
fi

# 7. VERIFICAÇÕES DE SEGURANÇA
echo ""
echo "🔐 VERIFICAÇÕES DE SEGURANÇA"
echo "============================="

# Usuário no grupo docker
if groups $USER | grep -q docker; then
    add_result "PASS" "Usuário no grupo docker"
else
    add_result "WARN" "Usuário não está no grupo docker"
fi

# Permissões de arquivos
if [ -r ".env" ]; then
    add_result "PASS" "Arquivo .env legível"
else
    add_result "FAIL" "Arquivo .env não legível"
fi

# 8. VERIFICAÇÕES DE PERFORMANCE
echo ""
echo "⚡ VERIFICAÇÕES DE PERFORMANCE"
echo "=============================="

# Espaço em disco
disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    add_result "PASS" "Espaço em disco OK ($disk_usage%)"
elif [ "$disk_usage" -lt 90 ]; then
    add_result "WARN" "Pouco espaço em disco ($disk_usage%)"
else
    add_result "FAIL" "Disco quase cheio ($disk_usage%)"
fi

# Tempo de resposta
frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "0")
if (( $(echo "$frontend_time < 5" | bc -l) )); then
    add_result "PASS" "Frontend rápido (${frontend_time}s)"
else
    add_result "WARN" "Frontend lento (${frontend_time}s)"
fi

backend_time=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL" 2>/dev/null || echo "0")
if (( $(echo "$backend_time < 3" | bc -l) )); then
    add_result "PASS" "Backend rápido (${backend_time}s)"
else
    add_result "WARN" "Backend lento (${backend_time}s)"
fi

# 9. VERIFICAÇÕES DE LOGS
echo ""
echo "📋 VERIFICAÇÕES DE LOGS"
echo "========================"

# Logs de erro
error_logs=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>&1 | grep -i "error\|exception\|fail" | wc -l)
if [ "$error_logs" -eq 0 ]; then
    add_result "PASS" "Nenhum erro nos logs recentes"
elif [ "$error_logs" -lt 5 ]; then
    add_result "WARN" "$error_logs erro(s) nos logs recentes"
else
    add_result "FAIL" "$error_logs erro(s) nos logs recentes"
fi

# 10. VERIFICAÇÕES DE REDE
echo ""
echo "🌐 VERIFICAÇÕES DE REDE"
echo "========================"

# Portas em uso
ports=(80 8000 5432 6379 5173)
for port in "${ports[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        add_result "PASS" "Porta $port está em uso"
    else
        add_result "WARN" "Porta $port não está em uso"
    fi
done

# 11. RESUMO FINAL
echo ""
echo "📊 RESUMO DO CHECKLIST"
echo "======================"

total_checks=$((${#PASSED_CHECKS[@]} + ${#FAILED_CHECKS[@]} + ${#WARNING_CHECKS[@]}))
passed_count=${#PASSED_CHECKS[@]}
failed_count=${#FAILED_CHECKS[@]}
warning_count=${#WARNING_CHECKS[@]}

echo ""
echo "📈 ESTATÍSTICAS:"
echo "   Total de verificações: $total_checks"
echo "   ✅ Passou: $passed_count"
echo "   ❌ Falhou: $failed_count"
echo "   ⚠️  Aviso: $warning_count"

# Calcular percentual de sucesso
if [ $total_checks -gt 0 ]; then
    success_rate=$((passed_count * 100 / total_checks))
    echo "   📊 Taxa de sucesso: ${success_rate}%"
else
    success_rate=0
    echo "   📊 Taxa de sucesso: 0%"
fi

echo ""
echo "📋 RESULTADOS DETALHADOS:"
echo "========================="

if [ ${#FAILED_CHECKS[@]} -gt 0 ]; then
    echo ""
    echo "❌ FALHAS CRÍTICAS:"
    for check in "${FAILED_CHECKS[@]}"; do
        echo "   - $check"
    done
fi

if [ ${#WARNING_CHECKS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  AVISOS:"
    for check in "${WARNING_CHECKS[@]}"; do
        echo "   - $check"
    done
fi

echo ""
echo "🎯 RECOMENDAÇÕES:"
echo "=================="

if [ $failed_count -gt 0 ]; then
    echo "❌ CORRIJA AS FALHAS CRÍTICAS ANTES DE PROSSEGUIR"
    echo "   - Execute os scripts de correção indicados"
    echo "   - Verifique logs e configurações"
    echo "   - Teste novamente após correções"
elif [ $warning_count -gt 0 ]; then
    echo "⚠️  ATENÇÃO AOS AVISOS"
    echo "   - Considere corrigir os avisos para melhor performance"
    echo "   - Alguns avisos podem ser ignorados em desenvolvimento"
    echo "✅ SISTEMA PRONTO PARA PRODUÇÃO"
else
    echo "🎉 PERFEITO! SISTEMA 100% FUNCIONAL"
    echo "   - Todos os testes passaram"
    echo "   - Sistema pronto para produção"
    echo "   - Pode prosseguir com confiança"
fi

echo ""
echo "🔧 PRÓXIMOS PASSOS:"
echo "==================="

if [ $failed_count -gt 0 ]; then
    echo "1. Corrija as falhas críticas"
    echo "2. Execute este checklist novamente"
    echo "3. Teste funcionalidades específicas"
elif [ $success_rate -ge 80 ]; then
    echo "1. Sistema está pronto para uso"
    echo "2. Monitore logs regularmente"
    echo "3. Faça backups periódicos"
    echo "4. Configure alertas de monitoramento"
else
    echo "1. Revise os avisos"
    echo "2. Otimize configurações"
    echo "3. Execute testes de stress"
fi

echo ""
echo "💡 DICAS FINAIS:"
echo "================"
echo "   - Execute este checklist regularmente"
echo "   - Mantenha backups atualizados"
echo "   - Monitore logs e performance"
echo "   - Configure alertas automáticos"
echo "   - Documente mudanças importantes"

echo ""
echo "🚀 CHECKLIST FINALIZADO!"
echo "========================" 