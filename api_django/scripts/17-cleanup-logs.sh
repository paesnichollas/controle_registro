#!/bin/bash

# =============================================================================
# SCRIPT: 17-cleanup-logs.sh
# DESCRIÇÃO: Limpa e rotaciona logs Docker e Nginx
# USO: ./scripts/17-cleanup-logs.sh [opções]
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
    echo "  -d, --days N             Dias para manter logs (padrão: 7)"
    echo "  -p, --path DIR           Diretório de logs (padrão: detecta)"
    echo "  -s, --size SIZE          Tamanho máximo em MB (padrão: 100)"
    echo "  -c, --compress           Comprime logs antigos"
    echo "  -r, --rotate             Rotaciona logs grandes"
    echo "  -f, --force              Força limpeza sem confirmação"
    echo "  -v, --verbose            Mostra informações detalhadas"
    echo "  -h, --help               Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                       # Limpeza básica"
    echo "  $0 -d 30                # Manter 30 dias"
    echo "  $0 -p /var/log          # Diretório específico"
    echo "  $0 -s 50                # Máximo 50MB"
    echo "  $0 -c -r                # Comprimir e rotacionar"
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

# Função para confirmar ação
confirm_action() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    read -p "🤔 Continuar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Operação cancelada pelo usuário"
        exit 0
    fi
}

# Função para limpar logs Docker
cleanup_docker_logs() {
    echo "🐳 Limpando logs Docker..."
    
    # Verificar se Docker está rodando
    if ! docker info >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker não está rodando${NC}"
        return
    fi
    
    # Encontrar containers com logs grandes
    LARGE_CONTAINERS=$(docker ps --format "{{.Names}}\t{{.Size}}" | grep -E "(GB|MB)" || true)
    
    if [ -n "$LARGE_CONTAINERS" ]; then
        echo "📋 Containers com logs grandes:"
        echo "$LARGE_CONTAINERS" | while read container; do
            CONTAINER_NAME=$(echo "$container" | awk '{print $1}')
            CONTAINER_SIZE=$(echo "$container" | awk '{print $2}')
            echo "   - $CONTAINER_NAME ($CONTAINER_SIZE)"
            
            if [ "$FORCE_CLEANUP" = false ]; then
                read -p "   Limpar logs de $CONTAINER_NAME? (s/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Ss]$ ]]; then
                    echo "   🧹 Limpando logs..."
                    docker logs --tail 1000 "$CONTAINER_NAME" > /dev/null 2>&1 || true
                    echo "   ✅ Logs limpos"
                fi
            else
                echo "   🧹 Limpando logs..."
                docker logs --tail 1000 "$CONTAINER_NAME" > /dev/null 2>&1 || true
                echo "   ✅ Logs limpos"
            fi
        done
    else
        echo "✅ Nenhum container com logs grandes encontrado"
    fi
    
    # Limpar logs do sistema Docker
    if [ -d "/var/lib/docker/containers" ]; then
        echo "🗑️  Limpando logs do sistema Docker..."
        find /var/lib/docker/containers -name "*-json.log" -size +10M -exec truncate -s 0 {} \; 2>/dev/null || true
        echo "✅ Logs do sistema Docker limpos"
    fi
}

# Função para limpar logs Nginx
cleanup_nginx_logs() {
    echo "🌐 Limpando logs Nginx..."
    
    NGINX_LOG_DIRS=("/var/log/nginx" "/etc/nginx/logs" "/usr/local/nginx/logs")
    
    for log_dir in "${NGINX_LOG_DIRS[@]}"; do
        if [ -d "$log_dir" ]; then
            echo "📁 Processando: $log_dir"
            
            # Encontrar logs antigos
            OLD_LOGS=$(find "$log_dir" -name "*.log.*" -mtime +"$DAYS_TO_KEEP" 2>/dev/null || true)
            
            if [ -n "$OLD_LOGS" ]; then
                echo "🗑️  Removendo logs antigos:"
                echo "$OLD_LOGS" | while read log_file; do
                    echo "   - $log_file"
                    rm -f "$log_file"
                done
            fi
            
            # Comprimir logs se solicitado
            if [ "$COMPRESS_LOGS" = true ]; then
                echo "📦 Comprimindo logs..."
                find "$log_dir" -name "*.log" -size +1M -exec gzip -f {} \; 2>/dev/null || true
                echo "✅ Logs comprimidos"
            fi
            
            # Rotacionar logs grandes
            if [ "$ROTATE_LOGS" = true ]; then
                echo "🔄 Rotacionando logs grandes..."
                find "$log_dir" -name "*.log" -size +"$MAX_SIZE"M -exec bash -c '
                    for file; do
                        if [ -f "$file" ]; then
                            mv "$file" "$file.$(date +%Y%m%d_%H%M%S)"
                            touch "$file"
                            echo "   Rotacionado: $file"
                        fi
                    done
                ' bash {} + 2>/dev/null || true
            fi
        fi
    done
}

# Função para limpar logs do projeto
cleanup_project_logs() {
    echo "📁 Limpando logs do projeto..."
    
    # Logs do projeto atual
    PROJECT_LOGS=("django.log" "os_operations.log" "webhooks.log" "*.log")
    
    for log_pattern in "${PROJECT_LOGS[@]}"; do
        find . -name "$log_pattern" -type f 2>/dev/null | while read log_file; do
            if [ -f "$log_file" ]; then
                LOG_SIZE=$(du -h "$log_file" | cut -f1)
                LOG_AGE=$(find "$log_file" -mtime +"$DAYS_TO_KEEP" 2>/dev/null || true)
                
                if [ -n "$LOG_AGE" ]; then
                    echo "🗑️  Removendo log antigo: $log_file ($LOG_SIZE)"
                    rm -f "$log_file"
                elif [ "$ROTATE_LOGS" = true ]; then
                    # Verificar se log é maior que o limite
                    LOG_SIZE_BYTES=$(stat -c%s "$log_file" 2>/dev/null || echo "0")
                    MAX_SIZE_BYTES=$((MAX_SIZE * 1024 * 1024))
                    
                    if [ "$LOG_SIZE_BYTES" -gt "$MAX_SIZE_BYTES" ]; then
                        echo "🔄 Rotacionando log grande: $log_file ($LOG_SIZE)"
                        mv "$log_file" "$log_file.$(date +%Y%m%d_%H%M%S)"
                        touch "$log_file"
                    fi
                fi
            fi
        done
    done
}

# Variáveis padrão
DAYS_TO_KEEP=7
LOG_PATH=""
MAX_SIZE=100
COMPRESS_LOGS=false
ROTATE_LOGS=false
FORCE_CLEANUP=false
VERBOSE=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--days)
            DAYS_TO_KEEP="$2"
            shift 2
            ;;
        -p|--path)
            LOG_PATH="$2"
            shift 2
            ;;
        -s|--size)
            MAX_SIZE="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS_LOGS=true
            shift
            ;;
        -r|--rotate)
            ROTATE_LOGS=true
            shift
            ;;
        -f|--force)
            FORCE_CLEANUP=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
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

echo "🧹 Iniciando limpeza de logs..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se bc está instalado
check_bc

# Detectar diretório de logs se não especificado
if [ -z "$LOG_PATH" ]; then
    if [ -d "/var/log" ]; then
        LOG_PATH="/var/log"
    else
        LOG_PATH="."
    fi
fi

# Verificar se diretório existe
if [ ! -d "$LOG_PATH" ]; then
    echo -e "${RED}❌ ERRO: Diretório de logs não encontrado: $LOG_PATH${NC}"
    exit 1
fi

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "🧹 LIMPEZA DE LOGS - $TIMESTAMP"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# Mostrar configurações
echo "📋 Configurações:"
echo "   Dias para manter: $DAYS_TO_KEEP"
echo "   Diretório de logs: $LOG_PATH"
echo "   Tamanho máximo: ${MAX_SIZE}MB"
echo "   Comprimir logs: $COMPRESS_LOGS"
echo "   Rotacionar logs: $ROTATE_LOGS"
echo "   Forçar limpeza: $FORCE_CLEANUP"

# Confirmar se não forçado
if [ "$FORCE_CLEANUP" = false ]; then
    confirm_action "Iniciar limpeza de logs?"
fi

# 1. Limpar logs Docker
cleanup_docker_logs

echo ""

# 2. Limpar logs Nginx
cleanup_nginx_logs

echo ""

# 3. Limpar logs do projeto
cleanup_project_logs

echo ""

# 4. Limpeza geral do sistema
echo "🗑️  Limpeza geral do sistema..."

# Limpar logs do sistema
if [ -d "/var/log" ]; then
    echo "📁 Limpando logs do sistema..."
    
    # Logs antigos do sistema
    SYSTEM_LOGS=$(find /var/log -name "*.log.*" -mtime +"$DAYS_TO_KEEP" 2>/dev/null || true)
    if [ -n "$SYSTEM_LOGS" ]; then
        echo "🗑️  Removendo logs antigos do sistema..."
        echo "$SYSTEM_LOGS" | head -10 | while read log_file; do
            echo "   - $log_file"
            rm -f "$log_file"
        done
        echo "   ... e mais $(echo "$SYSTEM_LOGS" | wc -l) arquivos"
    fi
    
    # Limpar logs vazios
    EMPTY_LOGS=$(find /var/log -name "*.log" -empty 2>/dev/null || true)
    if [ -n "$EMPTY_LOGS" ]; then
        echo "🗑️  Removendo logs vazios..."
        echo "$EMPTY_LOGS" | head -5 | while read log_file; do
            echo "   - $log_file"
            rm -f "$log_file"
        done
    fi
fi

# 5. Limpar logs temporários
echo "🗑️  Limpando logs temporários..."
find /tmp -name "*.log" -mtime +1 -delete 2>/dev/null || true
find /var/tmp -name "*.log" -mtime +1 -delete 2>/dev/null || true

# 6. Relatório final
echo ""
echo "📊 RELATÓRIO FINAL:"
echo "-------------------"

# Espaço liberado
echo "💾 Espaço em disco:"
df -h / | tail -1

# Logs restantes
echo ""
echo "📋 Logs restantes no projeto:"
find . -name "*.log" -type f 2>/dev/null | while read log_file; do
    if [ -f "$log_file" ]; then
        LOG_SIZE=$(du -h "$log_file" | cut -f1)
        echo "   - $log_file ($LOG_SIZE)"
    fi
done

# Containers com logs grandes
echo ""
echo "🐳 Containers com logs grandes:"
docker ps --format "{{.Names}}\t{{.Size}}" | grep -E "(GB|MB)" 2>/dev/null || echo "   Nenhum"

echo ""
echo -e "${GREEN}🎉 Limpeza de logs concluída!${NC}"
echo ""
echo "💡 DICAS DE MANUTENÇÃO:"
echo "   - Execute este script regularmente"
echo "   - Configure rotação automática de logs"
echo "   - Monitore uso de disco: ./scripts/05-disk-usage.sh"
echo "   - Configure logrotate para logs do sistema"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Ver logs Docker: docker logs CONTAINER"
echo "   - Limpar logs: docker logs --tail 1000 CONTAINER"
echo "   - Verificar espaço: df -h"
echo "   - Monitorar logs: tail -f ARQUIVO.log" 