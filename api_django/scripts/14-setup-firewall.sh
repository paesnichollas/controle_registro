#!/bin/bash

# =============================================================================
# SCRIPT: 14-setup-firewall.sh
# DESCRIÇÃO: Configura firewall UFW para segurança básica
# USO: ./scripts/14-setup-firewall.sh [opções]
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
    echo "  -p, --ports PORTAS       Portas adicionais para liberar (ex: 3000,8080)"
    echo "  -s, --ssh-port PORTA     Porta SSH personalizada (padrão: 22)"
    echo "  -d, --dry-run            Simula configuração sem aplicar"
    echo "  -r, --reset              Reseta firewall para padrão"
    echo "  -h, --help               Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                       # Configuração básica"
    echo "  $0 -p 3000,8080         # Libera portas adicionais"
    echo "  $0 -s 2222              # SSH na porta 2222"
    echo "  $0 -d                   # Simula sem aplicar"
}

# Função para verificar se usuário é root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ ERRO: Este script precisa ser executado como root${NC}"
        echo "💡 Execute com: sudo $0"
        exit 1
    fi
}

# Função para verificar se UFW está instalado
check_ufw() {
    if ! command -v ufw >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  UFW não encontrado. Instalando...${NC}"
        apt-get update && apt-get install -y ufw
    fi
}

# Função para verificar se porta é válida
validate_port() {
    local port=$1
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        return 1
    fi
    return 0
}

# Função para simular configuração
dry_run_config() {
    echo "🧪 SIMULAÇÃO - Nenhuma alteração será aplicada"
    echo ""
    echo "📋 Configuração que seria aplicada:"
    echo "   - UFW habilitado"
    echo "   - Política padrão: DENY"
    echo "   - SSH (porta $SSH_PORT): ALLOW"
    echo "   - HTTP (porta 80): ALLOW"
    echo "   - HTTPS (porta 443): ALLOW"
    
    if [ -n "$ADDITIONAL_PORTS" ]; then
        echo "   - Portas adicionais: $ADDITIONAL_PORTS"
    fi
    
    echo ""
    echo "💡 Para aplicar: execute sem --dry-run"
}

# Variáveis padrão
SSH_PORT=22
ADDITIONAL_PORTS=""
DRY_RUN=false
RESET_FIREWALL=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--ports)
            ADDITIONAL_PORTS="$2"
            shift 2
            ;;
        -s|--ssh-port)
            SSH_PORT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -r|--reset)
            RESET_FIREWALL=true
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

echo "🛡️  Configurando firewall UFW..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se usuário é root
check_root

# Verificar se UFW está instalado
check_ufw

# Validar porta SSH
if ! validate_port "$SSH_PORT"; then
    echo -e "${RED}❌ ERRO: Porta SSH inválida: $SSH_PORT${NC}"
    exit 1
fi

# Validar portas adicionais
if [ -n "$ADDITIONAL_PORTS" ]; then
    echo "🔍 Validando portas adicionais..."
    IFS=',' read -ra PORTS <<< "$ADDITIONAL_PORTS"
    for port in "${PORTS[@]}"; do
        if ! validate_port "$port"; then
            echo -e "${RED}❌ ERRO: Porta inválida: $port${NC}"
            exit 1
        fi
    done
fi

# Simular se solicitado
if [ "$DRY_RUN" = true ]; then
    dry_run_config
    exit 0
fi

# Reset firewall se solicitado
if [ "$RESET_FIREWALL" = true ]; then
    echo "🔄 Resetando firewall UFW..."
    ufw --force reset
    echo "✅ Firewall resetado"
    exit 0
fi

# Verificar status atual do UFW
echo "📊 Status atual do UFW:"
ufw status verbose

echo ""

# Configurar UFW
echo "⚙️  Configurando firewall..."

# Resetar configurações
echo "🔄 Resetando configurações..."
ufw --force reset

# Definir política padrão
echo "🔒 Definindo política padrão: DENY"
ufw default deny incoming
ufw default allow outgoing

# Liberar SSH
echo "🔓 Liberando SSH na porta $SSH_PORT..."
ufw allow "$SSH_PORT/tcp"

# Liberar HTTP e HTTPS
echo "🌐 Liberando HTTP (80) e HTTPS (443)..."
ufw allow 80/tcp
ufw allow 443/tcp

# Liberar portas adicionais se especificadas
if [ -n "$ADDITIONAL_PORTS" ]; then
    echo "🔓 Liberando portas adicionais..."
    IFS=',' read -ra PORTS <<< "$ADDITIONAL_PORTS"
    for port in "${PORTS[@]}"; do
        echo "   Porta $port/tcp"
        ufw allow "$port/tcp"
    done
done

# Habilitar UFW
echo "✅ Habilitando UFW..."
ufw --force enable

echo ""
echo "📊 Configuração aplicada:"
ufw status numbered

echo ""

# Verificar se SSH ainda está acessível
echo "🔍 Verificando conectividade SSH..."
if nc -z localhost "$SSH_PORT" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH acessível na porta $SSH_PORT${NC}"
else
    echo -e "${YELLOW}⚠️  SSH não está respondendo na porta $SSH_PORT${NC}"
    echo "💡 Verifique se o serviço SSH está rodando"
fi

# Verificar portas web
echo "🌐 Verificando portas web..."
if nc -z localhost 80 2>/dev/null; then
    echo -e "${GREEN}✅ HTTP (80) acessível${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP (80) não está respondendo${NC}"
fi

if nc -z localhost 443 2>/dev/null; then
    echo -e "${GREEN}✅ HTTPS (443) acessível${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS (443) não está respondendo${NC}"
fi

# Verificar portas adicionais
if [ -n "$ADDITIONAL_PORTS" ]; then
    echo "🔍 Verificando portas adicionais..."
    IFS=',' read -ra PORTS <<< "$ADDITIONAL_PORTS"
    for port in "${PORTS[@]}"; do
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}✅ Porta $port acessível${NC}"
        else
            echo -e "${YELLOW}⚠️  Porta $port não está respondendo${NC}"
        fi
    done
fi

echo ""
echo -e "${GREEN}🎉 Firewall UFW configurado com sucesso!${NC}"
echo ""
echo "📋 RESUMO DA CONFIGURAÇÃO:"
echo "   - Política padrão: DENY (entrada), ALLOW (saída)"
echo "   - SSH: ALLOW (porta $SSH_PORT)"
echo "   - HTTP: ALLOW (porta 80)"
echo "   - HTTPS: ALLOW (porta 443)"
if [ -n "$ADDITIONAL_PORTS" ]; then
    echo "   - Portas adicionais: $ADDITIONAL_PORTS"
fi
echo ""
echo "💡 DICAS DE SEGURANÇA:"
echo "   - Mantenha o SSH sempre acessível"
echo "   - Monitore logs: sudo tail -f /var/log/ufw.log"
echo "   - Teste conectividade antes de aplicar"
echo "   - Configure fail2ban para proteção adicional"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Status: sudo ufw status"
echo "   - Logs: sudo tail -f /var/log/ufw.log"
echo "   - Adicionar porta: sudo ufw allow PORTA/tcp"
echo "   - Remover regra: sudo ufw delete NUMERO"
echo "   - Reset: sudo ufw --force reset" 