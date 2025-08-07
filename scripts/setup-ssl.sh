#!/bin/bash

# Script para configuração de SSL com Let's Encrypt
# Controle Registro - VPS

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Configuração SSL - Let's Encrypt${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se o arquivo .env existe
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error "Arquivo .env não encontrado!"
        exit 1
    fi
    
    print_message "Arquivo .env encontrado!"
}

# Verificar se o domínio está configurado
check_domain() {
    print_message "Verificando configuração do domínio..."
    
    # Extrair domínio do .env
    DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
        print_error "Domínio não configurado corretamente no .env!"
        print_message "Configure VITE_API_URL com seu domínio real (ex: https://seu-dominio.com/api)"
        exit 1
    fi
    
    print_message "Domínio configurado: $DOMAIN"
}

# Verificar se Certbot está instalado
check_certbot() {
    print_message "Verificando Certbot..."
    
    if ! command -v certbot > /dev/null 2>&1; then
        print_message "Instalando Certbot..."
        sudo apt update
        sudo apt install -y certbot
    else
        print_message "Certbot já está instalado!"
    fi
}

# Verificar se o domínio está resolvendo
check_domain_resolution() {
    print_message "Verificando resolução do domínio..."
    
    # Extrair domínio
    DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    
    # Verificar se o domínio resolve para o IP atual
    CURRENT_IP=$(curl -s ifconfig.me)
    DOMAIN_IP=$(dig +short $DOMAIN)
    
    if [ "$DOMAIN_IP" != "$CURRENT_IP" ]; then
        print_warning "⚠️ O domínio $DOMAIN não está resolvendo para o IP atual ($CURRENT_IP)"
        print_warning "Verifique se o DNS está configurado corretamente"
        print_message "IP atual: $CURRENT_IP"
        print_message "IP do domínio: $DOMAIN_IP"
        
        read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_message "✅ Domínio resolvendo corretamente!"
    fi
}

# Parar serviços para liberar porta 80
stop_services() {
    print_message "Parando serviços para liberar porta 80..."
    
    docker-compose -f docker-compose.vps.yml down
    
    print_message "Serviços parados!"
}

# Gerar certificado SSL
generate_certificate() {
    print_message "Gerando certificado SSL..."
    
    # Extrair domínio
    DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    
    # Criar diretório SSL se não existir
    mkdir -p ssl
    
    # Gerar certificado
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    if [ $? -eq 0 ]; then
        print_message "✅ Certificado SSL gerado com sucesso!"
    else
        print_error "❌ Erro ao gerar certificado SSL"
        return 1
    fi
}

# Copiar certificados
copy_certificates() {
    print_message "Copiando certificados..."
    
    # Extrair domínio
    DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    
    # Copiar certificados
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem
    
    # Ajustar permissões
    sudo chown $USER:$USER ssl/*
    sudo chmod 600 ssl/key.pem
    sudo chmod 644 ssl/cert.pem
    
    print_message "✅ Certificados copiados!"
}

# Verificar certificados
verify_certificates() {
    print_message "Verificando certificados..."
    
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        # Verificar validade
        EXPIRY=$(openssl x509 -in ssl/cert.pem -noout -enddate | cut -d= -f2)
        print_message "✅ Certificado válido até: $EXPIRY"
        
        # Verificar domínio
        CERT_DOMAIN=$(openssl x509 -in ssl/cert.pem -noout -subject | sed 's/.*CN = //')
        print_message "✅ Certificado para domínio: $CERT_DOMAIN"
    else
        print_error "❌ Certificados não encontrados!"
        return 1
    fi
}

# Iniciar serviços
start_services() {
    print_message "Iniciando serviços..."
    
    docker-compose -f docker-compose.vps.yml up -d
    
    print_message "Aguardando serviços ficarem prontos..."
    
    # Aguardar nginx
    until curl -f http://localhost/health > /dev/null 2>&1; do
        sleep 5
    done
    
    print_message "✅ Serviços iniciados!"
}

# Testar HTTPS
test_https() {
    print_message "Testando HTTPS..."
    
    # Extrair domínio
    DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    
    # Testar conectividade HTTPS
    if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
        print_message "✅ HTTPS funcionando corretamente!"
    else
        print_warning "⚠️ HTTPS não está respondendo. Verifique se o domínio está apontando para este servidor."
    fi
}

# Configurar renovação automática
setup_auto_renewal() {
    print_message "Configurando renovação automática..."
    
    # Criar script de renovação
    cat > /tmp/renew-ssl.sh << 'EOF'
#!/bin/bash
# Script de renovação SSL

DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')

# Renovar certificado
sudo certbot renew --quiet

# Copiar novos certificados
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem

# Ajustar permissões
sudo chown $USER:$USER ssl/*
sudo chmod 600 ssl/key.pem
sudo chmod 644 ssl/cert.pem

# Reiniciar nginx
docker-compose -f docker-compose.vps.yml restart nginx

echo "SSL renovado em $(date)" >> /var/log/ssl-renewal.log
EOF
    
    # Mover script para o projeto
    mv /tmp/renew-ssl.sh scripts/renew-ssl.sh
    chmod +x scripts/renew-ssl.sh
    
    # Adicionar ao crontab (renovar duas vezes por dia)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * $(pwd)/scripts/renew-ssl.sh") | crontab -
    
    print_message "✅ Renovação automática configurada!"
}

# Mostrar informações finais
show_info() {
    print_message "Configuração SSL concluída com sucesso! 🎉"
    echo ""
    print_message "Informações do certificado:"
    
    # Extrair domínio
    DOMAIN=$(grep "VITE_API_URL" .env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')
    
    echo "  🌐 Domínio: $DOMAIN"
    echo "  🔒 Certificado: ssl/cert.pem"
    echo "  🔑 Chave privada: ssl/key.pem"
    echo "  📅 Expira em: $(openssl x509 -in ssl/cert.pem -noout -enddate | cut -d= -f2)"
    echo ""
    print_message "URLs de acesso:"
    echo "  🌐 Aplicação: https://$DOMAIN"
    echo "  🔧 API: https://$DOMAIN/api"
    echo "  📚 Admin Django: https://$DOMAIN/admin"
    echo ""
    print_message "Comandos úteis:"
    echo "  🔄 Renovar manualmente: ./scripts/renew-ssl.sh"
    echo "  📋 Ver logs SSL: tail -f /var/log/ssl-renewal.log"
    echo "  🔍 Verificar certificado: openssl x509 -in ssl/cert.pem -text -noout"
    echo ""
    print_warning "IMPORTANTE:"
    echo "  🔄 O certificado será renovado automaticamente"
    echo "  📧 Configure um email válido para notificações do Let's Encrypt"
    echo "  🔒 O certificado é válido por 90 dias"
}

# Função principal
main() {
    print_header
    
    check_env_file
    check_domain
    check_certbot
    check_domain_resolution
    stop_services
    generate_certificate
    copy_certificates
    verify_certificates
    start_services
    test_https
    setup_auto_renewal
    show_info
}

# Executar função principal
main "$@"
