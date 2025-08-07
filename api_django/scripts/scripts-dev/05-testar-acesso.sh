#!/bin/bash

# =============================================================================
# SCRIPT: 05-testar-acesso.sh
# DESCRIÇÃO: Testa acesso às URLs principais do sistema
# USO: ./05-testar-acesso.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./05-testar-acesso.sh [dev|prod]"
    exit 1
fi

echo "🧪 TESTANDO ACESSO AO AMBIENTE $ENVIRONMENT..."
echo "==============================================="

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

# Função para testar URL com detalhes
test_url_detailed() {
    local url=$1
    local description=$2
    local timeout=15
    local max_retries=3
    local retry_count=0
    
    echo "🔍 Testando: $description"
    echo "   URL: $url"
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s --max-time $timeout -w "\nHTTP Status: %{http_code}\nTempo: %{time_total}s\n" "$url" >/tmp/curl_output 2>&1; then
            http_code=$(tail -n 2 /tmp/curl_output | grep "HTTP Status:" | cut -d' ' -f3)
            response_time=$(tail -n 2 /tmp/curl_output | grep "Tempo:" | cut -d' ' -f2)
            
            if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
                echo "✅ $description - ACESSÍVEL (HTTP $http_code, ${response_time}s)"
                return 0
            else
                echo "⚠️  $description - RESPONDEU MAS COM ERRO (HTTP $http_code)"
                return 1
            fi
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                echo "   ⏳ Tentativa $retry_count/$max_retries falhou, tentando novamente..."
                sleep 2
            else
                echo "❌ $description - NÃO ACESSÍVEL após $max_retries tentativas"
                return 1
            fi
        fi
    done
}

# Função para testar endpoint específico
test_endpoint() {
    local url=$1
    local description=$2
    local expected_content=$3
    
    echo "🔍 Testando endpoint: $description"
    echo "   URL: $url"
    
    if curl -s --max-time 10 "$url" | grep -q "$expected_content" 2>/dev/null; then
        echo "✅ $description - FUNCIONANDO"
        return 0
    else
        echo "❌ $description - NÃO FUNCIONA"
        return 1
    fi
}

# 1. TESTAR FRONTEND
echo ""
echo "🌐 TESTANDO FRONTEND..."
echo "======================"

test_url_detailed "$FRONTEND_URL" "Frontend React"
frontend_status=$?

# 2. TESTAR BACKEND
echo ""
echo "🔧 TESTANDO BACKEND..."
echo "======================"

test_url_detailed "$BACKEND_URL" "Backend Django"
backend_status=$?

# 3. TESTAR ADMIN DJANGO
echo ""
echo "👤 TESTANDO ADMIN DJANGO..."
echo "============================"

test_url_detailed "$BACKEND_URL/admin" "Admin Django"
admin_status=$?

# 4. TESTAR ENDPOINTS ESPECÍFICOS
echo ""
echo "🔗 TESTANDO ENDPOINTS ESPECÍFICOS..."
echo "===================================="

# Testar API endpoints
test_endpoint "$BACKEND_URL/api/" "API Root" "api"
api_root_status=$?

# Testar health check (se existir)
test_endpoint "$BACKEND_URL/health/" "Health Check" "health"
health_status=$?

# 5. TESTAR CONECTIVIDADE COM BANCO
echo ""
echo "🗄️  TESTANDO CONECTIVIDADE COM BANCO..."
echo "======================================="

if docker-compose -f "$COMPOSE_FILE" ps -q db >/dev/null 2>&1; then
    echo "🔍 Testando conexão com PostgreSQL..."
    
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ Banco de dados - ACESSÍVEL"
        db_status=0
    else
        echo "❌ Banco de dados - NÃO ACESSÍVEL"
        db_status=1
    fi
else
    echo "⚠️  Container do banco não encontrado"
    db_status=1
fi

# 6. TESTAR REDIS (se existir)
echo ""
echo "🔴 TESTANDO REDIS..."
echo "==================="

if docker-compose -f "$COMPOSE_FILE" ps -q redis >/dev/null 2>&1; then
    echo "🔍 Testando conexão com Redis..."
    
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis - ACESSÍVEL"
        redis_status=0
    else
        echo "❌ Redis - NÃO ACESSÍVEL"
        redis_status=1
    fi
else
    echo "⚠️  Container Redis não encontrado"
    redis_status=1
fi

# 7. TESTAR SSL (se configurado)
echo ""
echo "🔐 TESTANDO SSL..."
echo "=================="

if [ -f "nginx/ssl/nginx.crt" ]; then
    echo "🔍 Testando certificados SSL..."
    
    if openssl x509 -in nginx/ssl/nginx.crt -text -noout >/dev/null 2>&1; then
        echo "✅ Certificados SSL - VÁLIDOS"
        ssl_status=0
    else
        echo "❌ Certificados SSL - INVÁLIDOS"
        ssl_status=1
    fi
else
    echo "⚠️  Certificados SSL não encontrados"
    ssl_status=1
fi

# 8. TESTAR PERFORMANCE
echo ""
echo "⚡ TESTANDO PERFORMANCE..."
echo "=========================="

# Testar tempo de resposta do frontend
echo "🔍 Testando tempo de resposta do Frontend..."
frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "0")
echo "   Tempo de resposta: ${frontend_time}s"

# Testar tempo de resposta do backend
echo "🔍 Testando tempo de resposta do Backend..."
backend_time=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL" 2>/dev/null || echo "0")
echo "   Tempo de resposta: ${backend_time}s"

# 9. VERIFICAR LOGS DE ERRO
echo ""
echo "📋 VERIFICANDO LOGS DE ERRO..."
echo "=============================="

echo "🔍 Últimos erros nos containers:"
docker-compose -f "$COMPOSE_FILE" logs --tail=50 | grep -i "error\|exception\|fail" || echo "   Nenhum erro encontrado nos logs recentes"

# 10. RESUMO FINAL
echo ""
echo "📊 RESUMO DOS TESTES..."
echo "======================="

tests=(
    ["Frontend"]=$frontend_status
    ["Backend"]=$backend_status
    ["Admin"]=$admin_status
    ["API Root"]=$api_root_status
    ["Health Check"]=$health_status
    ["Database"]=$db_status
    ["Redis"]=$redis_status
    ["SSL"]=$ssl_status
)

total_tests=${#tests[@]}
passed_tests=0

for test_name in "${!tests[@]}"; do
    if [ "${tests[$test_name]}" -eq 0 ]; then
        echo "✅ $test_name - OK"
        ((passed_tests++))
    else
        echo "❌ $test_name - FALHOU"
    fi
done

echo ""
echo "📈 RESULTADO: $passed_tests/$total_tests testes passaram"

if [ $passed_tests -eq $total_tests ]; then
    echo ""
    echo "🎉 TODOS OS TESTES PASSARAM!"
    echo "============================="
    echo "✅ Seu ambiente $ENVIRONMENT está funcionando perfeitamente"
else
    echo ""
    echo "⚠️  ALGUNS TESTES FALHARAM"
    echo "=========================="
    echo "🔧 Verifique os logs e configurações"
    echo "   Execute: docker-compose -f $COMPOSE_FILE logs"
fi

echo ""
echo "🔧 COMANDOS ÚTEIS PARA DEBUG:"
echo "   Ver logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   Shell backend: docker-compose -f $COMPOSE_FILE exec backend bash"
echo "   Shell db: docker-compose -f $COMPOSE_FILE exec db psql -U postgres"
echo "   Reiniciar: docker-compose -f $COMPOSE_FILE restart"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./06-backup-local.sh" 