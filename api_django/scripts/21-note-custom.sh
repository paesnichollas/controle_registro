#!/bin/bash

# =============================================================================
# SCRIPT: 21-note-custom.sh
# DESCRIÇÃO: Documenta customizações manuais feitas no sistema
# USO: ./scripts/21-note-custom.sh [opções]
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
    echo "  -t, --type TIPO          Tipo de customização (config, security, etc)"
    echo "  -c, --command COMANDO     Comando executado"
    echo "  -d, --description DESC    Descrição da customização"
    echo "  -f, --file ARQUIVO        Arquivo modificado"
    echo "  -p, --priority PRIORIDADE Prioridade (low, medium, high, critical)"
    echo "  -r, --review              Revisar customizações anteriores"
    echo "  -s, --search TERMO        Buscar customizações"
    echo "  -h, --help                Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0 -t config -c 'docker-compose up -d' -d 'Deploy inicial'"
    echo "  $0 -t security -f nginx.conf -d 'Configuração SSL'"
    echo "  $0 -r                      # Revisar customizações"
    echo "  $0 -s 'ssl'               # Buscar por SSL"
}

# Função para obter input do usuário
get_user_input() {
    local prompt="$1"
    local default="$2"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        echo "${input:-$default}"
    else
        read -p "$prompt: " input
        echo "$input"
    fi
}

# Função para validar prioridade
validate_priority() {
    local priority="$1"
    case "$priority" in
        low|medium|high|critical)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Função para obter tipo de customização
get_customization_type() {
    echo "📝 Tipos disponíveis:"
    echo "   1. config    - Configurações do sistema"
    echo "   2. security  - Segurança e firewall"
    echo "   3. database  - Banco de dados"
    echo "   4. docker    - Containers e Docker"
    echo "   5. nginx     - Servidor web"
    echo "   6. ssl       - Certificados SSL"
    echo "   7. backup    - Backups e restores"
    echo "   8. monitoring - Monitoramento"
    echo "   9. other     - Outros"
    
    get_user_input "Escolha o tipo de customização" "config"
}

# Função para obter prioridade
get_priority() {
    echo "🚨 Prioridades:"
    echo "   1. low       - Baixa prioridade"
    echo "   2. medium    - Média prioridade"
    echo "   3. high      - Alta prioridade"
    echo "   4. critical  - Crítica (afeta produção)"
    
    get_user_input "Escolha a prioridade" "medium"
}

# Função para adicionar customização
add_customization() {
    local type="$1"
    local command="$2"
    local description="$3"
    local file="$4"
    local priority="$5"
    
    # Validar prioridade
    if ! validate_priority "$priority"; then
        echo -e "${RED}❌ ERRO: Prioridade inválida: $priority${NC}"
        echo "💡 Prioridades válidas: low, medium, high, critical"
        priority=$(get_priority)
    fi
    
    # Obter informações adicionais se não fornecidas
    if [ -z "$type" ]; then
        type=$(get_customization_type)
    fi
    
    if [ -z "$description" ]; then
        description=$(get_user_input "Descreva a customização")
    fi
    
    if [ -z "$command" ]; then
        command=$(get_user_input "Comando executado (opcional)")
    fi
    
    if [ -z "$file" ]; then
        file=$(get_user_input "Arquivo modificado (opcional)")
    fi
    
    # Timestamp
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local date_only=$(date +"%Y-%m-%d")
    
    # Criar arquivo se não existir
    if [ ! -f "customizacoes.txt" ]; then
        echo "# =============================================================================" > customizacoes.txt
        echo "# HISTÓRICO DE CUSTOMIZAÇÕES MANUAIS" >> customizacoes.txt
        echo "# =============================================================================" >> customizacoes.txt
        echo "# Formato: DATA | TIPO | PRIORIDADE | DESCRIÇÃO | COMANDO | ARQUIVO" >> customizacoes.txt
        echo "# =============================================================================" >> customizacoes.txt
        echo "" >> customizacoes.txt
    fi
    
    # Adicionar entrada
    echo "$timestamp | $type | $priority | $description | $command | $file" >> customizacoes.txt
    
    echo ""
    echo -e "${GREEN}✅ Customização registrada!${NC}"
    echo "📁 Arquivo: customizacoes.txt"
    echo "📅 Data: $timestamp"
    echo "🏷️  Tipo: $type"
    echo "🚨 Prioridade: $priority"
    echo "📝 Descrição: $description"
}

# Função para revisar customizações
review_customizations() {
    echo "📋 Revisando customizações anteriores..."
    echo ""
    
    if [ ! -f "customizacoes.txt" ]; then
        echo "ℹ️  Nenhuma customização registrada ainda"
        return
    fi
    
    # Mostrar últimas 10 customizações
    echo "📊 ÚLTIMAS 10 CUSTOMIZAÇÕES:"
    echo "=" | tr '\n' '=' | head -c 80; echo ""
    
    tail -10 customizacoes.txt | while read line; do
        if [[ "$line" =~ ^[0-9] ]]; then
            # Parse da linha
            timestamp=$(echo "$line" | cut -d'|' -f1 | xargs)
            type=$(echo "$line" | cut -d'|' -f2 | xargs)
            priority=$(echo "$line" | cut -d'|' -f3 | xargs)
            description=$(echo "$line" | cut -d'|' -f4 | xargs)
            command=$(echo "$line" | cut -d'|' -f5 | xargs)
            file=$(echo "$line" | cut -d'|' -f6 | xargs)
            
            # Cor baseada na prioridade
            case "$priority" in
                critical)
                    priority_color="${RED}"
                    ;;
                high)
                    priority_color="${YELLOW}"
                    ;;
                medium)
                    priority_color="${BLUE}"
                    ;;
                low)
                    priority_color="${GREEN}"
                    ;;
                *)
                    priority_color="${NC}"
                    ;;
            esac
            
            echo -e "${priority_color}📅 $timestamp${NC}"
            echo -e "   🏷️  Tipo: $type"
            echo -e "   🚨 Prioridade: ${priority_color}$priority${NC}"
            echo -e "   📝 Descrição: $description"
            if [ -n "$command" ]; then
                echo -e "   💻 Comando: $command"
            fi
            if [ -n "$file" ]; then
                echo -e "   📁 Arquivo: $file"
            fi
            echo ""
        fi
    done
    
    # Estatísticas
    echo "📊 ESTATÍSTICAS:"
    echo "----------------"
    TOTAL=$(grep -c "^[0-9]" customizacoes.txt 2>/dev/null || echo "0")
    echo "   Total de customizações: $TOTAL"
    
    if [ "$TOTAL" -gt 0 ]; then
        CRITICAL=$(grep -c "critical" customizacoes.txt 2>/dev/null || echo "0")
        HIGH=$(grep -c "high" customizacoes.txt 2>/dev/null || echo "0")
        echo "   Críticas: $CRITICAL"
        echo "   Altas: $HIGH"
        
        # Por tipo
        echo "   Por tipo:"
        grep "^[0-9]" customizacoes.txt | cut -d'|' -f2 | sort | uniq -c | while read count type; do
            echo "     $type: $count"
        done
    fi
}

# Função para buscar customizações
search_customizations() {
    local term="$1"
    
    if [ -z "$term" ]; then
        term=$(get_user_input "Termo para buscar")
    fi
    
    echo "🔍 Buscando por: '$term'"
    echo ""
    
    if [ ! -f "customizacoes.txt" ]; then
        echo "ℹ️  Nenhuma customização registrada"
        return
    fi
    
    # Buscar no arquivo
    RESULTS=$(grep -i "$term" customizacoes.txt 2>/dev/null || true)
    
    if [ -n "$RESULTS" ]; then
        echo "📋 RESULTADOS ENCONTRADOS:"
        echo "=" | tr '\n' '=' | head -c 60; echo ""
        
        echo "$RESULTS" | while read line; do
            if [[ "$line" =~ ^[0-9] ]]; then
                timestamp=$(echo "$line" | cut -d'|' -f1 | xargs)
                type=$(echo "$line" | cut -d'|' -f2 | xargs)
                priority=$(echo "$line" | cut -d'|' -f3 | xargs)
                description=$(echo "$line" | cut -d'|' -f4 | xargs)
                
                echo "📅 $timestamp"
                echo "   🏷️  Tipo: $type"
                echo "   🚨 Prioridade: $priority"
                echo "   📝 Descrição: $description"
                echo ""
            fi
        done
    else
        echo "ℹ️  Nenhum resultado encontrado para '$term'"
    fi
}

# Variáveis padrão
CUSTOM_TYPE=""
CUSTOM_COMMAND=""
CUSTOM_DESCRIPTION=""
CUSTOM_FILE=""
CUSTOM_PRIORITY="medium"
REVIEW_MODE=false
SEARCH_MODE=false
SEARCH_TERM=""

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            CUSTOM_TYPE="$2"
            shift 2
            ;;
        -c|--command)
            CUSTOM_COMMAND="$2"
            shift 2
            ;;
        -d|--description)
            CUSTOM_DESCRIPTION="$2"
            shift 2
            ;;
        -f|--file)
            CUSTOM_FILE="$2"
            shift 2
            ;;
        -p|--priority)
            CUSTOM_PRIORITY="$2"
            shift 2
            ;;
        -r|--review)
            REVIEW_MODE=true
            shift
            ;;
        -s|--search)
            SEARCH_MODE=true
            SEARCH_TERM="$2"
            shift 2
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

echo "📝 Sistema de documentação de customizações..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Modo revisão
if [ "$REVIEW_MODE" = true ]; then
    review_customizations
    exit 0
fi

# Modo busca
if [ "$SEARCH_MODE" = true ]; then
    search_customizations "$SEARCH_TERM"
    exit 0
fi

# Modo adição (padrão)
echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "📝 NOVA CUSTOMIZAÇÃO MANUAL"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# Adicionar customização
add_customization "$CUSTOM_TYPE" "$CUSTOM_COMMAND" "$CUSTOM_DESCRIPTION" "$CUSTOM_FILE" "$CUSTOM_PRIORITY"

echo ""
echo "💡 DICAS:"
echo "   - Documente TODAS as alterações manuais"
echo "   - Use prioridade 'critical' para mudanças que afetam produção"
echo "   - Revise regularmente: ./scripts/11-note-custom.sh -r"
echo "   - Busque customizações: ./scripts/11-note-custom.sh -s 'termo'"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Revisar: $0 -r"
echo "   - Buscar: $0 -s 'ssl'"
echo "   - Adicionar: $0 -t config -d 'Descrição'" 