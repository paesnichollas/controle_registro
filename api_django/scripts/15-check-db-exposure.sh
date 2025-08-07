#!/bin/bash

# =============================================================================
# SCRIPT: 15-check-db-exposure.sh
# DESCRIÇÃO: Verifica se banco PostgreSQL está exposto externamente
# USO: ./scripts/15-check-db-exposure.sh [opções]
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

set -e  # Para execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir ajuda
show_help() {
    echo "📖 USO: $0 [opções]"
    echo ""
    echo "OPÇÕES:"
    echo "  -p, --port PORTA         Porta do banco (padrão: 5432)"
    echo "  -h, --host HOST          Host para testar (padrão: detecta)"
    echo "  -e, --external           Testa conectividade externa"
    echo "  -v, --verbose            Mostra informações detalhadas"
    echo "  -f, --fix                Aplica correções automáticas"
    echo "  -h, --help               Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                       # Verificação básica"
    echo "  $0 -p 5433              # Porta específica"
    echo "  $0 -e                   # Teste externo"
    echo "  $0 -f                   # Aplica correções"
}

# Função para obter IP público
get_public_ip() {
    curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "N/A"
}

# Função para verificar se porta está aberta localmente
check_local_port() {
    local port=$1
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        return 0
    elif ss -tlnp 2>/dev/null | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# Função para verificar se porta está aberta externamente
check_external_port() {
    local host=$1
    local port=$2
    
    # Usar nmap se disponível
    if command -v nmap >/dev/null 2>&1; then
        if nmap -p "$port" "$host" 2>/dev/null | grep -q "open"; then
            return 0
        fi
    fi
    
    # Fallback para nc
    if nc -z "$host" "$port" 2>/dev/null; then
        return 0
    fi
    
    return 1
}

# Função para aplicar correções
apply_fixes() {
    echo "🔧 Aplicando correções de segurança..."
    
    # Verificar se Docker está rodando
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ ERRO: Docker não está rodando${NC}"
        return 1
    fi
    
    # Encontrar container PostgreSQL
    DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "(postgres|db)" | head -1)
    
    if [ -z "$DB_CONTAINER" ]; then
        echo -e "${RED}❌ ERRO: Container PostgreSQL não encontrado${NC}"
        return 1
    fi
    
    echo "📝 Container encontrado: $DB_CONTAINER"
    
    # Verificar se porta 5432 está mapeada
    if docker port "$DB_CONTAINER" | grep -q "5432"; then
        echo -e "${YELLOW}⚠️  Porta 5432 está mapeada externamente${NC}"
        echo "🔧 Removendo mapeamento de porta..."
        
        # Parar container
        docker stop "$DB_CONTAINER"
        
        # Recriar sem mapeamento de porta
        echo "🔄 Recriando container sem exposição externa..."
        
        # Obter configuração atual
        CONTAINER_CONFIG=$(docker inspect "$DB_CONTAINER" --format '{{json .Config}}')
        
        # Recriar com docker-compose (recomendado)
        if [ -f "docker-compose.yml" ]; then
            echo "📝 Editando docker-compose.yml..."
            
            # Fazer backup
            cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
            
            # Remover mapeamento de porta 5432
            sed -i '/5432:5432/d' docker-compose.yml
            
            echo "✅ Mapeamento de porta removido do docker-compose.yml"
            echo "💡 Execute: docker-compose up -d para aplicar"
        else
            echo -e "${YELLOW}⚠️  docker-compose.yml não encontrado${NC}"
            echo "💡 Remova manualmente o mapeamento de porta 5432"
        fi
    else
        echo "✅ Porta 5432 não está mapeada externamente"
    fi
    
    # Verificar firewall
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "5432"; then
            echo -e "${YELLOW}⚠️  Porta 5432 está liberada no firewall${NC}"
            echo "🔧 Removendo regra do firewall..."
            ufw delete allow 5432/tcp
            echo "✅ Regra removida do firewall"
        else
            echo "✅ Porta 5432 não está liberada no firewall"
        fi
    fi
}

# Variáveis padrão
DB_PORT=5432
HOST=""
EXTERNAL_TEST=false
VERBOSE=false
APPLY_FIXES=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -e|--external)
            EXTERNAL_TEST=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--fix)
            APPLY_FIXES=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Argumento desconhecido: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🔍 Verificando exposição do banco PostgreSQL..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Detectar host se não especificado
if [ -z "$HOST" ]; then
    HOST=$(get_public_ip)
    if [ "$HOST" = "N/A" ]; then
        HOST="localhost"
    fi
fi

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "🔍 VERIFICAÇÃO DE EXPOSIÇÃO DO BANCO - $TIMESTAMP"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# 1. Verificar se Docker está rodando
echo "🐳 Verificando Docker..."
if docker info >/dev/null 2>&1; then
    echo "✅ Docker está rodando"
else
    echo -e "${RED}❌ ERRO: Docker não está rodando${NC}"
    exit 1
fi

# 2. Verificar containers PostgreSQL
echo ""
echo "🗄️  Verificando containers PostgreSQL..."
DB_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "(postgres|db)" || true)

if [ -n "$DB_CONTAINERS" ]; then
    echo "✅ Containers PostgreSQL encontrados:"
    echo "$DB_CONTAINERS" | while read container; do
        echo "   - $container"
        
        if [ "$VERBOSE" = true ]; then
            echo "     Portas mapeadas:"
            docker port "$container" | while read port_mapping; do
                echo "       $port_mapping"
            done
        fi
    done
else
    echo -e "${YELLOW}⚠️  Nenhum container PostgreSQL encontrado${NC}"
fi

# 3. Verificar portas localmente
echo ""
echo "🔌 Verificando portas localmente..."
if check_local_port "$DB_PORT"; then
    echo -e "${RED}🚨 ALERTA: Porta $DB_PORT está aberta localmente${NC}"
    
    # Mostrar processos usando a porta
    if [ "$VERBOSE" = true ]; then
        echo "📋 Processos usando porta $DB_PORT:"
        netstat -tlnp 2>/dev/null | grep ":$DB_PORT " || ss -tlnp 2>/dev/null | grep ":$DB_PORT "
    fi
else
    echo "✅ Porta $DB_PORT não está aberta localmente"
fi

# 4. Verificar docker-compose.yml
echo ""
echo "📄 Verificando docker-compose.yml..."
if grep -q "5432:5432" docker-compose.yml; then
    echo -e "${RED}🚨 ALERTA: Porta 5432 está mapeada no docker-compose.yml${NC}"
    echo "   Linha encontrada:"
    grep "5432:5432" docker-compose.yml
    echo ""
    echo "💡 SOLUÇÃO: Remova a linha '5432:5432' do docker-compose.yml"
else
    echo "✅ Porta 5432 não está mapeada no docker-compose.yml"
fi

# 5. Verificar firewall
echo ""
echo "🛡️  Verificando firewall..."
if command -v ufw >/dev/null 2>&1; then
    if ufw status | grep -q "$DB_PORT"; then
        echo -e "${RED}🚨 ALERTA: Porta $DB_PORT está liberada no firewall${NC}"
        echo "   Regras encontradas:"
        ufw status | grep "$DB_PORT"
    else
        echo "✅ Porta $DB_PORT não está liberada no firewall"
    fi
else
    echo -e "${YELLOW}⚠️  UFW não encontrado - verifique firewall manualmente${NC}"
fi

# 6. Teste externo se solicitado
if [ "$EXTERNAL_TEST" = true ]; then
    echo ""
    echo "🌐 Testando conectividade externa..."
    echo "   Host: $HOST"
    echo "   Porta: $DB_PORT"
    
    if check_external_port "$HOST" "$DB_PORT"; then
        echo -e "${RED}🚨 CRÍTICO: Porta $DB_PORT está acessível externamente em $HOST${NC}"
        echo "💡 AÇÕES IMEDIATAS:"
        echo "   1. Remova mapeamento de porta do docker-compose.yml"
        echo "   2. Configure firewall: sudo ufw deny $DB_PORT"
        echo "   3. Verifique se não há outros serviços expondo a porta"
    else
        echo "✅ Porta $DB_PORT não está acessível externamente"
    fi
fi

# 7. Verificar configurações de rede Docker
echo ""
echo "🌐 Verificando redes Docker..."
DOCKER_NETWORKS=$(docker network ls --format "{{.Name}}" | grep -v "bridge\|host\|none")

if [ -n "$DOCKER_NETWORKS" ]; then
    echo "📋 Redes Docker encontradas:"
    echo "$DOCKER_NETWORKS" | while read network; do
        echo "   - $network"
        
        if [ "$VERBOSE" = true ]; then
            echo "     Containers conectados:"
            docker network inspect "$network" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "     Nenhum"
        fi
    done
else
    echo "ℹ️  Nenhuma rede Docker customizada encontrada"
fi

# 8. Aplicar correções se solicitado
if [ "$APPLY_FIXES" = true ]; then
    echo ""
    apply_fixes
fi

echo ""
echo "⚠️  ALERTAS E RECOMENDAÇÕES:"
echo "----------------------------"

# Resumo dos problemas encontrados
ISSUES_FOUND=false

if check_local_port "$DB_PORT"; then
    echo -e "${RED}🚨 Porta $DB_PORT está aberta localmente${NC}"
    ISSUES_FOUND=true
fi

if grep -q "5432:5432" docker-compose.yml; then
    echo -e "${RED}🚨 Porta 5432 está mapeada no docker-compose.yml${NC}"
    ISSUES_FOUND=true
fi

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "$DB_PORT"; then
    echo -e "${RED}🚨 Porta $DB_PORT está liberada no firewall${NC}"
    ISSUES_FOUND=true
fi

if [ "$EXTERNAL_TEST" = true ] && check_external_port "$HOST" "$DB_PORT"; then
    echo -e "${RED}🚨 CRÍTICO: Porta $DB_PORT está acessível externamente${NC}"
    ISSUES_FOUND=true
fi

if [ "$ISSUES_FOUND" = false ]; then
    echo -e "${GREEN}✅ Nenhum problema de segurança encontrado${NC}"
else
    echo ""
    echo "💡 AÇÕES RECOMENDADAS:"
    echo "   1. Execute: ./scripts/08-check-db-exposure.sh -f"
    echo "   2. Remova mapeamento de porta do docker-compose.yml"
    echo "   3. Configure firewall: sudo ufw deny $DB_PORT"
    echo "   4. Use apenas redes Docker internas"
    echo "   5. Configure autenticação forte no PostgreSQL"
fi

echo ""
echo -e "${GREEN}🎉 Verificação de segurança concluída!${NC}"
echo ""
echo "💡 DICAS DE SEGURANÇA:"
echo "   - Nunca exponha banco de dados na internet"
echo "   - Use apenas redes Docker internas"
echo "   - Configure autenticação forte"
echo "   - Monitore logs de acesso"
echo "   - Faça backups regulares"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Verificar portas: netstat -tlnp"
echo "   - Testar conectividade: nc -zv HOST PORTA"
echo "   - Verificar firewall: sudo ufw status"
echo "   - Listar containers: docker ps" 