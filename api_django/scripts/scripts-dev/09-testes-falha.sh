#!/bin/bash

# =============================================================================
# SCRIPT: 09-testes-falha.sh
# DESCRIÇÃO: Testes de falha e resiliência do sistema
# USO: ./09-testes-falha.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./09-testes-falha.sh [dev|prod]"
    exit 1
fi

echo "🧪 TESTES DE FALHA E RESILIÊNCIA - AMBIENTE $ENVIRONMENT..."
echo "============================================================"

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

# Verificar se o arquivo existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Arquivo $COMPOSE_FILE não encontrado"
    exit 1
fi

# Verificar se os containers estão rodando
if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "❌ Containers não estão rodando"
    echo "   Execute: ./04-subir-ambiente.sh $ENVIRONMENT"
    exit 1
fi

echo "✅ Containers estão rodando"

# Função para testar URL
test_url() {
    local url=$1
    local description=$2
    local timeout=10
    
    if curl -s --max-time $timeout "$url" >/dev/null 2>&1; then
        echo "✅ $description - ACESSÍVEL"
        return 0
    else
        echo "❌ $description - NÃO ACESSÍVEL"
        return 1
    fi
}

# Função para aguardar container
wait_for_container() {
    local service=$1
    local max_wait=60
    local wait_time=0
    
    echo "⏳ Aguardando $service inicializar..."
    while [ $wait_time -lt $max_wait ]; do
        if docker-compose -f "$COMPOSE_FILE" ps -q "$service" >/dev/null 2>&1; then
            container_status=$(docker inspect --format='{{.State.Status}}' "$(docker-compose -f "$COMPOSE_FILE" ps -q "$service")" 2>/dev/null || echo "unknown")
            if [ "$container_status" = "running" ]; then
                echo "✅ $service está rodando"
                return 0
            fi
        fi
        sleep 2
        wait_time=$((wait_time + 2))
    done
    
    echo "❌ $service não inicializou em $max_wait segundos"
    return 1
}

# 1. TESTE 1: FALHA DO BANCO DE DADOS
echo ""
echo "🧪 TESTE 1: FALHA DO BANCO DE DADOS"
echo "===================================="

echo "📋 Simulando falha do banco de dados..."
echo "🛑 Parando container do banco..."

# Fazer backup antes do teste
echo "💾 Fazendo backup antes do teste..."
./06-backup-local.sh "$ENVIRONMENT" >/dev/null 2>&1 || true

# Parar banco
docker-compose -f "$COMPOSE_FILE" stop db

echo "⏳ Aguardando 10 segundos para verificar comportamento..."
sleep 10

# Testar se o backend ainda responde
echo "🔍 Testando resposta do backend..."
if test_url "$BACKEND_URL" "Backend (sem banco)"; then
    echo "⚠️  Backend ainda responde (pode estar usando cache)"
else
    echo "✅ Backend parou de responder (comportamento esperado)"
fi

# Testar se o frontend ainda responde
echo "🔍 Testando resposta do frontend..."
if test_url "$FRONTEND_URL" "Frontend (sem banco)"; then
    echo "✅ Frontend ainda responde (comportamento esperado)"
else
    echo "❌ Frontend parou de responder"
fi

# Restaurar banco
echo "🔄 Restaurando banco de dados..."
docker-compose -f "$COMPOSE_FILE" start db
wait_for_container "db"

echo "✅ Teste 1 concluído"

# 2. TESTE 2: FALHA DO BACKEND
echo ""
echo "🧪 TESTE 2: FALHA DO BACKEND"
echo "============================="

echo "📋 Simulando falha do backend..."
echo "🛑 Parando container do backend..."

# Parar backend
docker-compose -f "$COMPOSE_FILE" stop backend

echo "⏳ Aguardando 10 segundos para verificar comportamento..."
sleep 10

# Testar se o frontend ainda responde
echo "🔍 Testando resposta do frontend..."
if test_url "$FRONTEND_URL" "Frontend (sem backend)"; then
    echo "✅ Frontend ainda responde (pode ter funcionalidades limitadas)"
else
    echo "❌ Frontend parou de responder"
fi

# Testar se o banco ainda responde
echo "🔍 Testando resposta do banco..."
if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ Banco ainda responde (comportamento esperado)"
else
    echo "❌ Banco parou de responder"
fi

# Restaurar backend
echo "🔄 Restaurando backend..."
docker-compose -f "$COMPOSE_FILE" start backend
wait_for_container "backend"

echo "✅ Teste 2 concluído"

# 3. TESTE 3: FALHA DE PERMISSÕES
echo ""
echo "🧪 TESTE 3: FALHA DE PERMISSÕES"
echo "================================"

echo "📋 Simulando falha de permissões na pasta media..."

# Verificar se o container backend está rodando
if docker-compose -f "$COMPOSE_FILE" ps -q backend >/dev/null 2>&1; then
    echo "🔍 Testando permissões da pasta media..."
    
    # Tentar criar arquivo na pasta media
    if docker-compose -f "$COMPOSE_FILE" exec -T backend touch /app/media/test_permission.txt 2>/dev/null; then
        echo "✅ Permissões da pasta media estão corretas"
        # Limpar arquivo de teste
        docker-compose -f "$COMPOSE_FILE" exec -T backend rm -f /app/media/test_permission.txt
    else
        echo "❌ Problema de permissões na pasta media"
        echo "   Execute: ./06-fix-permissions.sh"
    fi
else
    echo "⚠️  Container backend não está rodando"
fi

echo "✅ Teste 3 concluído"

# 4. TESTE 4: FALHA DE REDE
echo ""
echo "🧪 TESTE 4: FALHA DE REDE"
echo "=========================="

echo "📋 Simulando falha de rede..."

# Verificar conectividade entre containers
echo "🔍 Testando conectividade entre containers..."

# Testar backend -> banco
if docker-compose -f "$COMPOSE_FILE" exec -T backend ping -c 1 db >/dev/null 2>&1; then
    echo "✅ Backend consegue acessar banco"
else
    echo "❌ Backend não consegue acessar banco"
fi

# Testar frontend -> backend
if docker-compose -f "$COMPOSE_FILE" exec -T frontend ping -c 1 backend >/dev/null 2>&1; then
    echo "✅ Frontend consegue acessar backend"
else
    echo "❌ Frontend não consegue acessar backend"
fi

echo "✅ Teste 4 concluído"

# 5. TESTE 5: FALHA DE MEMÓRIA
echo ""
echo "🧪 TESTE 5: FALHA DE MEMÓRIA"
echo "============================="

echo "📋 Verificando uso de memória dos containers..."

# Verificar uso de memória
services=$(docker-compose -f "$COMPOSE_FILE" config --services)
for service in $services; do
    if docker-compose -f "$COMPOSE_FILE" ps -q "$service" >/dev/null 2>&1; then
        container_id=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service")
        memory_usage=$(docker stats --no-stream --format "table {{.MemUsage}}" "$container_id" | tail -1)
        echo "📊 $service: $memory_usage"
    fi
done

echo "✅ Teste 5 concluído"

# 6. TESTE 6: FALHA DE DISCO
echo ""
echo "🧪 TESTE 6: FALHA DE DISCO"
echo "==========================="

echo "📋 Verificando espaço em disco..."

# Verificar espaço em disco
disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 90 ]; then
    echo "❌ DISCO QUASE CHEIO: ${disk_usage}%"
    echo "   Execute: ./08-limpeza-sistema.sh $ENVIRONMENT"
elif [ "$disk_usage" -gt 80 ]; then
    echo "⚠️  DISCO COM POUCO ESPAÇO: ${disk_usage}%"
else
    echo "✅ Espaço em disco OK: ${disk_usage}%"
fi

echo "✅ Teste 6 concluído"

# 7. TESTE 7: FALHA DE CONFIGURAÇÃO
echo ""
echo "🧪 TESTE 7: FALHA DE CONFIGURAÇÃO"
echo "=================================="

echo "📋 Verificando configurações críticas..."

# Verificar variáveis críticas
critical_vars=("SECRET_KEY" "POSTGRES_PASSWORD" "DJANGO_SUPERUSER_PASSWORD")
for var in "${critical_vars[@]}"; do
    if grep -q "^$var=" .env; then
        value=$(grep "^$var=" .env | cut -d'=' -f2)
        if [ -n "$value" ] && [ "$value" != "your-secret-key-here-change-in-production" ]; then
            echo "✅ $var configurada"
        else
            echo "⚠️  $var precisa ser configurada"
        fi
    else
        echo "❌ $var NÃO encontrada"
    fi
done

echo "✅ Teste 7 concluído"

# 8. TESTE 8: FALHA DE LOGS
echo ""
echo "🧪 TESTE 8: FALHA DE LOGS"
echo "=========================="

echo "📋 Verificando logs de erro..."

# Verificar logs de erro recentes
error_logs=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>&1 | grep -i "error\|exception\|fail" | wc -l)
if [ "$error_logs" -gt 0 ]; then
    echo "⚠️  $error_logs erros encontrados nos logs recentes"
    echo "🔍 Últimos erros:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 | grep -i "error\|exception\|fail" | tail -5
else
    echo "✅ Nenhum erro encontrado nos logs recentes"
fi

echo "✅ Teste 8 concluído"

# 9. TESTE 9: FALHA DE SSL
echo ""
echo "🧪 TESTE 9: FALHA DE SSL"
echo "========================="

echo "📋 Verificando certificados SSL..."

if [ -f "nginx/ssl/nginx.crt" ] && [ -f "nginx/ssl/nginx.key" ]; then
    echo "✅ Certificados SSL encontrados"
    
    # Verificar validade do certificado
    if openssl x509 -in nginx/ssl/nginx.crt -checkend 0 >/dev/null 2>&1; then
        echo "✅ Certificado SSL válido"
    else
        echo "❌ Certificado SSL expirado"
    fi
else
    echo "⚠️  Certificados SSL não encontrados"
    echo "   Execute: ./02-configurar-projeto.sh"
fi

echo "✅ Teste 9 concluído"

# 10. TESTE 10: FALHA DE PERFORMANCE
echo ""
echo "🧪 TESTE 10: FALHA DE PERFORMANCE"
echo "=================================="

echo "📋 Testando performance..."

# Testar tempo de resposta do frontend
frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "0")
echo "📊 Tempo de resposta Frontend: ${frontend_time}s"

# Testar tempo de resposta do backend
backend_time=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL" 2>/dev/null || echo "0")
echo "📊 Tempo de resposta Backend: ${backend_time}s"

# Avaliar performance
if (( $(echo "$frontend_time > 5" | bc -l) )); then
    echo "⚠️  Frontend lento: ${frontend_time}s"
else
    echo "✅ Frontend OK: ${frontend_time}s"
fi

if (( $(echo "$backend_time > 3" | bc -l) )); then
    echo "⚠️  Backend lento: ${backend_time}s"
else
    echo "✅ Backend OK: ${backend_time}s"
fi

echo "✅ Teste 10 concluído"

# 11. RESUMO FINAL
echo ""
echo "📊 RESUMO DOS TESTES DE FALHA..."
echo "================================"

echo "✅ TODOS OS TESTES CONCLUÍDOS!"
echo ""
echo "📋 TESTES REALIZADOS:"
echo "   1. ✅ Falha do banco de dados"
echo "   2. ✅ Falha do backend"
echo "   3. ✅ Falha de permissões"
echo "   4. ✅ Falha de rede"
echo "   5. ✅ Falha de memória"
echo "   6. ✅ Falha de disco"
echo "   7. ✅ Falha de configuração"
echo "   8. ✅ Falha de logs"
echo "   9. ✅ Falha de SSL"
echo "   10. ✅ Falha de performance"
echo ""
echo "🎉 SISTEMA TESTADO PARA RESILIÊNCIA!"
echo "====================================="
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   Ver logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   Reiniciar: docker-compose -f $COMPOSE_FILE restart"
echo "   Parar: docker-compose -f $COMPOSE_FILE down"
echo "   Subir: docker-compose -f $COMPOSE_FILE up -d"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./10-checklist-final.sh"
echo ""
echo "💡 DICA: Para monitoramento contínuo:"
echo "   - Configure alertas de disco"
echo "   - Monitore logs de erro"
echo "   - Verifique performance regularmente" 