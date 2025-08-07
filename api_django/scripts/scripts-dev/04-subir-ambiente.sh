#!/bin/bash

# =============================================================================
# SCRIPT: 04-subir-ambiente.sh
# DESCRIÇÃO: Sube os containers de desenvolvimento e produção
# USO: ./04-subir-ambiente.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./04-subir-ambiente.sh [dev|prod]"
    exit 1
fi

echo "🚀 SUBINDO AMBIENTE $ENVIRONMENT..."
echo "====================================="

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERRO: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado"
    echo "   Execute: ./02-configurar-projeto.sh"
    exit 1
fi

# Definir arquivo compose baseado no ambiente
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    echo "🔧 Usando ambiente de DESENVOLVIMENTO"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🔧 Usando ambiente de PRODUÇÃO"
fi

# Verificar se o arquivo existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Arquivo $COMPOSE_FILE não encontrado"
    exit 1
fi

# 1. PARAR CONTAINERS EXISTENTES
echo ""
echo "🛑 PARANDO CONTAINERS EXISTENTES..."
echo "==================================="

if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "🔄 Parando containers em execução..."
    docker-compose -f "$COMPOSE_FILE" down
    echo "✅ Containers parados"
else
    echo "✅ Nenhum container em execução"
fi

# 2. LIMPAR IMAGENS ANTIGAS (OPCIONAL)
echo ""
echo "🧹 LIMPANDO IMAGENS ANTIGAS..."
echo "==============================="

read -p "Deseja limpar imagens antigas? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Removendo imagens não utilizadas..."
    docker image prune -f
    echo "✅ Limpeza concluída"
fi

# 3. CONSTRUIR IMAGENS
echo ""
echo "🔨 CONSTRUINDO IMAGENS..."
echo "========================="

echo "📦 Construindo imagens do ambiente $ENVIRONMENT..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Imagens construídas com sucesso"
else
    echo "❌ ERRO na construção das imagens"
    exit 1
fi

# 4. SUBIR CONTAINERS
echo ""
echo "🚀 SUBINDO CONTAINERS..."
echo "========================"

echo "📦 Iniciando containers..."
docker-compose -f "$COMPOSE_FILE" up -d

if [ $? -eq 0 ]; then
    echo "✅ Containers iniciados"
else
    echo "❌ ERRO ao iniciar containers"
    exit 1
fi

# 5. VERIFICAR STATUS DOS CONTAINERS
echo ""
echo "🔍 VERIFICANDO STATUS DOS CONTAINERS..."
echo "======================================="

# Aguardar um pouco para os containers inicializarem
echo "⏳ Aguardando inicialização dos containers..."
sleep 10

# Verificar status
services=$(docker-compose -f "$COMPOSE_FILE" config --services)
all_healthy=true

for service in $services; do
    status=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service")
    if [ -n "$status" ]; then
        container_status=$(docker inspect --format='{{.State.Status}}' "$status" 2>/dev/null || echo "unknown")
        if [ "$container_status" = "running" ]; then
            echo "✅ $service - RUNNING"
        else
            echo "❌ $service - $container_status"
            all_healthy=false
        fi
    else
        echo "❌ $service - NÃO ENCONTRADO"
        all_healthy=false
    fi
done

# 6. EXECUTAR MIGRAÇÕES (se for backend)
echo ""
echo "🗄️  EXECUTANDO MIGRAÇÕES..."
echo "============================"

if docker-compose -f "$COMPOSE_FILE" ps -q backend >/dev/null 2>&1; then
    echo "🔄 Executando migrações do Django..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate
    
    if [ $? -eq 0 ]; then
        echo "✅ Migrações executadas com sucesso"
    else
        echo "⚠️  ERRO nas migrações"
    fi
    
    # Criar superusuário se configurado
    if grep -q "CREATE_SUPERUSER=true" .env; then
        echo "👤 Criando superusuário..."
        docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py createsuperuser --noinput || true
        echo "✅ Superusuário criado (se não existia)"
    fi
else
    echo "⚠️  Container backend não encontrado"
fi

# 7. VERIFICAR LOGS
echo ""
echo "📋 VERIFICANDO LOGS..."
echo "======================"

echo "🔍 Últimos logs dos containers:"
docker-compose -f "$COMPOSE_FILE" logs --tail=20

# 8. TESTAR CONECTIVIDADE
echo ""
echo "🌐 TESTANDO CONECTIVIDADE..."
echo "============================"

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

# Testar URLs baseado no ambiente
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "🧪 Testando ambiente de desenvolvimento..."
    test_url "http://localhost:5173" "Frontend (Dev)"
    test_url "http://localhost:8000" "Backend (Dev)"
    test_url "http://localhost:8000/admin" "Admin Django"
else
    echo "🧪 Testando ambiente de produção..."
    test_url "http://localhost" "Frontend (Prod)"
    test_url "http://localhost:8000" "Backend (Prod)"
    test_url "http://localhost:8000/admin" "Admin Django"
fi

# 9. MOSTRAR INFORMAÇÕES FINAIS
echo ""
echo "🎉 AMBIENTE $ENVIRONMENT SUBIDO COM SUCESSO!"
echo "============================================="
echo ""
echo "📋 INFORMAÇÕES DO AMBIENTE:"
echo "   🌐 Frontend: http://localhost$( [ "$ENVIRONMENT" = "dev" ] && echo ":5173" || echo "" )"
echo "   🔧 Backend: http://localhost:8000"
echo "   👤 Admin: http://localhost:8000/admin"
echo "   🗄️  Banco: localhost:5432"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   Ver logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   Parar: docker-compose -f $COMPOSE_FILE down"
echo "   Reiniciar: docker-compose -f $COMPOSE_FILE restart"
echo "   Shell backend: docker-compose -f $COMPOSE_FILE exec backend bash"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./05-testar-acesso.sh"
echo ""
echo "💡 DICA: Para monitorar em tempo real:"
echo "   watch -n 2 'docker-compose -f $COMPOSE_FILE ps'" 