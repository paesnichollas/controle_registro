#!/bin/bash

# =============================================================================
# SCRIPT: 12-disk-usage.sh
# DESCRIÇÃO: Monitora uso de disco, volumes Docker e containers com logs grandes
# USO: ./scripts/12-disk-usage.sh [opções]
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
    echo "  -t, --threshold N       Percentual de alerta (padrão: 85)"
    echo "  -d, --detailed          Mostra informações detalhadas"
    echo "  -c, --containers        Foca apenas em containers"
    echo "  -v, --volumes           Foca apenas em volumes"
    echo "  -l, --logs              Analisa logs grandes"
    echo "  -h, --help              Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                      # Monitoramento básico"
    echo "  $0 -t 90               # Alerta em 90%"
    echo "  $0 -d                  # Informações detalhadas"
    echo "  $0 -l                  # Análise de logs"
}

# Função para formatar bytes em formato legível
format_bytes() {
    local bytes=$1
    if [ "$bytes" -gt 1073741824 ]; then
        echo "$(echo "scale=2; $bytes/1073741824" | bc) GB"
    elif [ "$bytes" -gt 1048576 ]; then
        echo "$(echo "scale=2; $bytes/1048576" | bc) MB"
    elif [ "$bytes" -gt 1024 ]; then
        echo "$(echo "scale=2; $bytes/1024" | bc) KB"
    else
        echo "${bytes} B"
    fi
}

# Função para verificar se bc está instalado
check_bc() {
    if ! command -v bc >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  bc não encontrado. Instalando...${NC}"
        sudo apt-get update && sudo apt-get install -y bc
    fi
}

# Variáveis padrão
THRESHOLD=85
DETAILED=false
SHOW_CONTAINERS=false
SHOW_VOLUMES=false
ANALYZE_LOGS=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        -d|--detailed)
            DETAILED=true
            shift
            ;;
        -c|--containers)
            SHOW_CONTAINERS=true
            shift
            ;;
        -v|--volumes)
            SHOW_VOLUMES=true
            shift
            ;;
        -l|--logs)
            ANALYZE_LOGS=true
            shift
            ;;
        -h|--help)
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

echo "💾 Analisando uso de disco e volumes Docker..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ ERRO: Docker não está rodando${NC}"
    exit 1
fi

# Verificar se bc está instalado
check_bc

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "💾 RELATÓRIO DE USO DE DISCO - $TIMESTAMP"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# 1. Uso geral do disco
echo "📊 USO GERAL DO DISCO:"
echo "----------------------"
df -h | grep -E "(Filesystem|/$)" | while read line; do
    if echo "$line" | grep -q "/$"; then
        USAGE=$(echo "$line" | awk '{print $5}' | sed 's/%//')
        if [ "$USAGE" -gt "$THRESHOLD" ]; then
            echo -e "${RED}⚠️  $line${NC}"
        else
            echo -e "${GREEN}✅ $line${NC}"
        fi
    else
        echo "   $line"
    fi
done

echo ""

# 2. Volumes Docker
if [ "$SHOW_CONTAINERS" = false ] || [ "$SHOW_VOLUMES" = true ]; then
    echo "🗄️  VOLUMES DOCKER:"
    echo "------------------"
    
    if docker volume ls -q | grep -q .; then
        docker volume ls --format "table {{.Name}}\t{{.Driver}}" | while read line; do
            if echo "$line" | grep -q "DRIVER"; then
                echo "   $line"
            else
                VOLUME_NAME=$(echo "$line" | awk '{print $1}')
                VOLUME_SIZE=$(docker run --rm -v "$VOLUME_NAME":/vol busybox du -sh /vol 2>/dev/null | cut -f1 || echo "N/A")
                echo "   $line ($VOLUME_SIZE)"
            fi
        done
    else
        echo "   Nenhum volume encontrado"
    fi
fi

echo ""

# 3. Containers e seus tamanhos
if [ "$SHOW_VOLUMES" = false ] || [ "$SHOW_CONTAINERS" = true ]; then
    echo "🐳 CONTAINERS DOCKER:"
    echo "---------------------"
    
    if docker ps -q | grep -q .; then
        echo "   CONTAINER ID    NOME                    STATUS    TAMANHO"
        echo "   ------------    ----                    ------    -------"
        
        docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Size}}" | tail -n +2 | while read line; do
            CONTAINER_ID=$(echo "$line" | awk '{print $1}')
            CONTAINER_NAME=$(echo "$line" | awk '{print $2}')
            CONTAINER_STATUS=$(echo "$line" | awk '{print $3}')
            CONTAINER_SIZE=$(echo "$line" | awk '{print $4}')
            
            # Verificar se container está usando muito espaço
            if echo "$CONTAINER_SIZE" | grep -q "GB"; then
                echo -e "   ${YELLOW}⚠️  $CONTAINER_ID    $CONTAINER_NAME    $CONTAINER_STATUS    $CONTAINER_SIZE${NC}"
            else
                echo "   $CONTAINER_ID    $CONTAINER_NAME    $CONTAINER_STATUS    $CONTAINER_SIZE"
            fi
        done
    else
        echo "   Nenhum container rodando"
    fi
fi

echo ""

# 4. Análise de logs se solicitado
if [ "$ANALYZE_LOGS" = true ]; then
    echo "📝 ANÁLISE DE LOGS:"
    echo "-------------------"
    
    # Logs do Docker
    DOCKER_LOG_SIZE=$(sudo du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
    if [ "$DOCKER_LOG_SIZE" != "0" ]; then
        echo "   Logs Docker: $DOCKER_LOG_SIZE"
    fi
    
    # Logs do projeto
    if [ -f "django.log" ]; then
        DJANGO_LOG_SIZE=$(du -sh django.log | cut -f1)
        echo "   Log Django: $DJANGO_LOG_SIZE"
    fi
    
    if [ -f "os_operations.log" ]; then
        OS_LOG_SIZE=$(du -sh os_operations.log | cut -f1)
        echo "   Log OS: $OS_LOG_SIZE"
    fi
    
    # Encontrar logs grandes
    echo ""
    echo "🔍 LOGS MAIORES QUE 10MB:"
    find . -name "*.log" -size +10M 2>/dev/null | while read log_file; do
        LOG_SIZE=$(du -sh "$log_file" | cut -f1)
        echo "   $log_file ($LOG_SIZE)"
    done
fi

echo ""

# 5. Informações detalhadas se solicitado
if [ "$DETAILED" = true ]; then
    echo "🔍 INFORMAÇÕES DETALHADAS:"
    echo "---------------------------"
    
    # Espaço usado por imagens
    echo "📦 Imagens Docker:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
    
    echo ""
    
    # Containers parados
    echo "⏸️  Containers parados:"
    docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" | head -5
    
    echo ""
    
    # Volumes não utilizados
    echo "🗑️  Volumes não utilizados:"
    docker volume ls -f dangling=true --format "table {{.Name}}\t{{.Driver}}" | head -5
fi

echo ""

# 6. Alertas e recomendações
echo "⚠️  ALERTAS E RECOMENDAÇÕES:"
echo "----------------------------"

# Verificar uso do disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$THRESHOLD" ]; then
    echo -e "${RED}🚨 DISCO CRÍTICO: ${DISK_USAGE}% usado (limite: ${THRESHOLD}%)${NC}"
    echo "   💡 Ações recomendadas:"
    echo "      - Execute: docker system prune -a"
    echo "      - Limpe logs antigos: ./scripts/08-cleanup-logs.sh"
    echo "      - Verifique arquivos temporários"
else
    echo -e "${GREEN}✅ Disco OK: ${DISK_USAGE}% usado${NC}"
fi

# Verificar containers com logs grandes
LARGE_CONTAINERS=$(docker ps --format "{{.Names}}\t{{.Size}}" | grep -E "(GB|MB)" | wc -l)
if [ "$LARGE_CONTAINERS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $LARGE_CONTAINERS container(s) com logs grandes${NC}"
    echo "   💡 Execute: docker logs --tail 1000 [container]"
fi

# Verificar volumes não utilizados
UNUSED_VOLUMES=$(docker volume ls -f dangling=true -q | wc -l)
if [ "$UNUSED_VOLUMES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $UNUSED_VOLUMES volume(s) não utilizado(s)${NC}"
    echo "   💡 Execute: docker volume prune"
fi

echo ""
echo -e "${GREEN}🎉 Análise de disco concluída!${NC}"
echo ""
echo "💡 DICAS DE MANUTENÇÃO:"
echo "   - Execute regularmente: docker system prune"
echo "   - Monitore logs: ./scripts/08-cleanup-logs.sh"
echo "   - Configure rotação de logs no Docker"
echo "   - Use volumes nomeados para dados importantes" 