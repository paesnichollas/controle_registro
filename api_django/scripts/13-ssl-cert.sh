#!/bin/bash

# =============================================================================
# SCRIPT: 13-ssl-cert.sh
# DESCRIÇÃO: Gera e renova certificados SSL usando Let's Encrypt/Certbot
# USO: ./scripts/13-ssl-cert.sh [opções]
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
    echo "  -d, --domain DOMINIO     Domínio para certificado (obrigatório)"
    echo "  -e, --email EMAIL        Email para notificações (obrigatório)"
    echo "  -r, --renew              Renovar certificados existentes"
    echo "  -t, --test               Modo teste (staging)"
    echo "  -f, --force              Força renovação mesmo se válido"
    echo "  -s, --stop-nginx         Para Nginx antes do processo"
    echo "  -h, --help               Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0 -d meu-site.com -e admin@meu-site.com    # Novo certificado"
    echo "  $0 -d meu-site.com -r                        # Renovar"
    echo "  $0 -d meu-site.com -t                        # Modo teste"
    echo "  $0 -d meu-site.com -r -f                     # Forçar renovação"
}

# Função para verificar se comando existe
check_command() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${RED}❌ ERRO: $cmd não encontrado${NC}"
        echo "💡 Instale com: sudo apt-get install $cmd"
        exit 1
    fi
}

# Função para verificar se usuário é root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ ERRO: Este script precisa ser executado como root${NC}"
        echo "💡 Execute com: sudo $0"
        exit 1
    fi
}

# Função para parar Nginx
stop_nginx() {
    if systemctl is-active --quiet nginx; then
        echo "🛑 Parando Nginx..."
        systemctl stop nginx
        NGINX_STOPPED=true
    else
        echo "ℹ️  Nginx já está parado"
        NGINX_STOPPED=false
    fi
}

# Função para iniciar Nginx
start_nginx() {
    if [ "$NGINX_STOPPED" = true ]; then
        echo "▶️  Iniciando Nginx..."
        systemctl start nginx
        if systemctl is-active --quiet nginx; then
            echo "✅ Nginx iniciado com sucesso"
        else
            echo -e "${RED}❌ ERRO: Falha ao iniciar Nginx${NC}"
        fi
    fi
}

# Variáveis padrão
DOMAIN=""
EMAIL=""
RENEW_MODE=false
TEST_MODE=false
FORCE_RENEW=false
STOP_NGINX=false
NGINX_STOPPED=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -r|--renew)
            RENEW_MODE=true
            shift
            ;;
        -t|--test)
            TEST_MODE=true
            shift
            ;;
        -f|--force)
            FORCE_RENEW=true
            shift
            ;;
        -s|--stop-nginx)
            STOP_NGINX=true
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

echo "🔒 Configurando certificados SSL com Let's Encrypt..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se usuário é root
check_root

# Verificar argumentos obrigatórios
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ ERRO: Domínio é obrigatório (-d ou --domain)${NC}"
    show_help
    exit 1
fi

if [ -z "$EMAIL" ] && [ "$RENEW_MODE" = false ]; then
    echo -e "${RED}❌ ERRO: Email é obrigatório para novos certificados (-e ou --email)${NC}"
    show_help
    exit 1
fi

# Verificar comandos necessários
echo "🔍 Verificando dependências..."
check_command "certbot"
check_command "nginx"

# Verificar se domínio é válido
echo "🔍 Verificando domínio: $DOMAIN"
if ! echo "$DOMAIN" | grep -E "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$" >/dev/null; then
    echo -e "${RED}❌ ERRO: Domínio inválido: $DOMAIN${NC}"
    exit 1
fi

# Verificar conectividade com o domínio
echo "🌐 Testando conectividade com $DOMAIN..."
if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Não foi possível resolver o domínio $DOMAIN${NC}"
    echo "💡 Verifique se o DNS está configurado corretamente"
fi

# Verificar se porta 80 está aberta
echo "🔌 Verificando porta 80..."
if ! nc -z "$DOMAIN" 80 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Porta 80 não está acessível em $DOMAIN${NC}"
    echo "💡 Certifique-se de que o Nginx está rodando e a porta 80 está aberta"
fi

# Configurar diretórios
CERTBOT_DIR="/etc/letsencrypt"
WEBROOT_DIR="/var/www/html"
CERT_PATH="$CERTBOT_DIR/live/$DOMAIN"

# Verificar se certificado já existe
if [ -d "$CERT_PATH" ]; then
    echo "✅ Certificado existente encontrado para $DOMAIN"
    
    if [ "$RENEW_MODE" = false ] && [ "$FORCE_RENEW" = false ]; then
        echo "📅 Verificando validade do certificado..."
        if certbot certificates | grep -q "$DOMAIN"; then
            EXPIRY=$(certbot certificates | grep "$DOMAIN" -A 5 | grep "VALID" | awk '{print $2}')
            echo "   Válido até: $EXPIRY"
            
            # Verificar se expira em menos de 30 dias
            DAYS_LEFT=$(certbot certificates | grep "$DOMAIN" -A 5 | grep "VALID" | awk '{print $4}' | sed 's/days//')
            if [ "$DAYS_LEFT" -lt 30 ]; then
                echo -e "${YELLOW}⚠️  Certificado expira em $DAYS_LEFT dias${NC}"
                RENEW_MODE=true
            else
                echo "✅ Certificado ainda é válido"
                if [ "$FORCE_RENEW" = false ]; then
                    echo "💡 Use -r para renovar ou -f para forçar renovação"
                    exit 0
                fi
            fi
        fi
    fi
else
    echo "📝 Nenhum certificado encontrado para $DOMAIN"
    RENEW_MODE=false
fi

# Parar Nginx se solicitado
if [ "$STOP_NGINX" = true ]; then
    stop_nginx
fi

# Configurar argumentos do certbot
CERTBOT_ARGS="--nginx --non-interactive --agree-tos"
if [ "$TEST_MODE" = true ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --staging"
    echo "🧪 Modo teste ativado (staging)"
fi

if [ "$FORCE_RENEW" = true ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --force-renewal"
    echo "⚡ Renovação forçada ativada"
fi

# Executar certbot
echo ""
if [ "$RENEW_MODE" = true ]; then
    echo "🔄 Renovando certificado para $DOMAIN..."
    if certbot renew --cert-name "$DOMAIN" $CERTBOT_ARGS; then
        echo -e "${GREEN}✅ Certificado renovado com sucesso!${NC}"
    else
        echo -e "${RED}❌ ERRO: Falha ao renovar certificado${NC}"
        start_nginx
        exit 1
    fi
else
    echo "🔐 Gerando novo certificado para $DOMAIN..."
    if certbot certonly --nginx -d "$DOMAIN" --email "$EMAIL" $CERTBOT_ARGS; then
        echo -e "${GREEN}✅ Certificado gerado com sucesso!${NC}"
    else
        echo -e "${RED}❌ ERRO: Falha ao gerar certificado${NC}"
        start_nginx
        exit 1
    fi
fi

# Verificar certificado
echo ""
echo "🔍 Verificando certificado..."
if [ -f "$CERT_PATH/fullchain.pem" ]; then
    echo "✅ Certificado instalado: $CERT_PATH/fullchain.pem"
    
    # Mostrar informações do certificado
    echo "📊 Informações do certificado:"
    openssl x509 -in "$CERT_PATH/fullchain.pem" -text -noout | grep -E "(Subject:|Not After:|Issuer:)" | head -3
    
    # Verificar validade
    VALID_UNTIL=$(openssl x509 -in "$CERT_PATH/fullchain.pem" -noout -enddate | cut -d= -f2)
    echo "   Válido até: $VALID_UNTIL"
else
    echo -e "${RED}❌ ERRO: Certificado não encontrado${NC}"
    start_nginx
    exit 1
fi

# Iniciar Nginx se foi parado
start_nginx

# Testar configuração do Nginx
echo ""
echo "🔧 Testando configuração do Nginx..."
if nginx -t; then
    echo "✅ Configuração do Nginx válida"
    
    # Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    systemctl reload nginx
    echo "✅ Nginx recarregado"
else
    echo -e "${RED}❌ ERRO: Configuração do Nginx inválida${NC}"
    exit 1
fi

# Testar HTTPS
echo ""
echo "🌐 Testando HTTPS..."
if curl -s -I "https://$DOMAIN" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS funcionando corretamente!${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS não está respondendo - verifique a configuração${NC}"
fi

# Configurar renovação automática
echo ""
echo "⏰ Configurando renovação automática..."
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "📝 Adicionando cron job para renovação automática..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    echo "✅ Cron job adicionado (renovação diária às 12:00)"
else
    echo "✅ Cron job já configurado"
fi

echo ""
echo -e "${GREEN}🎉 Configuração SSL concluída!${NC}"
echo ""
echo "📋 RESUMO:"
echo "   Domínio: $DOMAIN"
echo "   Certificado: $CERT_PATH/fullchain.pem"
echo "   Chave privada: $CERT_PATH/privkey.pem"
echo "   Renovação automática: Configurada"
echo ""
echo "💡 PRÓXIMOS PASSOS:"
echo "   1. Teste o site em https://$DOMAIN"
echo "   2. Configure redirecionamento HTTP → HTTPS no Nginx"
echo "   3. Monitore renovações: certbot certificates"
echo "   4. Configure backup dos certificados"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Ver certificados: certbot certificates"
echo "   - Renovar manualmente: certbot renew"
echo "   - Testar renovação: certbot renew --dry-run" 