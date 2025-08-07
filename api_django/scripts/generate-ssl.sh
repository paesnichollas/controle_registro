#!/bin/bash

# Script para gerar certificados SSL auto-assinados
# Para desenvolvimento local
# Compatível com Linux, WSL e Windows (Git Bash)

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Detectar sistema operacional
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Verificar se OpenSSL está disponível
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL não encontrado!"
        print_warning "Para Windows:"
        echo "  1. Instale Git Bash ou WSL"
        echo "  2. Ou instale OpenSSL via Chocolatey: choco install openssl"
        echo "  3. Ou use WSL para executar este script"
        print_warning "Para Linux:"
        echo "  sudo apt-get install openssl"
        print_warning "Para macOS:"
        echo "  brew install openssl"
        return 1
    fi
    return 0
}

# Gerar certificado SSL
generate_ssl_cert() {
    local os_type=$(detect_os)
    
    print_message "Sistema detectado: $os_type"
    print_message "Gerando certificado SSL auto-assinado..."
    
    # Criar diretório para certificados
    mkdir -p nginx/ssl
    
    # Gerar certificado SSL auto-assinado
    # Usar formato universal para compatibilidade
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=BR/ST=SP/L=SaoPaulo/O=Development/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    
    if [ $? -eq 0 ]; then
        print_message "Certificado SSL gerado com sucesso!"
    else
        print_error "Erro ao gerar certificado SSL"
        return 1
    fi
}

# Verificar se os arquivos foram criados
verify_certificates() {
    if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
        print_message "Certificados criados:"
        echo "  - nginx/ssl/cert.pem"
        echo "  - nginx/ssl/key.pem"
        
        # Mostrar informações do certificado
        print_info "Informações do certificado:"
        openssl x509 -in nginx/ssl/cert.pem -text -noout | grep -E "(Subject:|DNS:|IP Address:)" || true
    else
        print_error "Certificados não foram criados corretamente."
        return 1
    fi
}

# Função principal
main() {
    print_message "🔐 INICIANDO GERAÇÃO DE CERTIFICADO SSL"
    echo
    
    # Verificar se estamos no diretório correto
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Execute este script no diretório raiz do projeto (onde está o docker-compose.yml)"
        echo "   Diretório atual: $(pwd)"
        echo "   Execute: cd /caminho/para/seu/projeto"
        return 1
    fi
    
    # Verificar OpenSSL
    if ! check_openssl; then
        return 1
    fi
    
    # Detectar sistema operacional e dar orientações
    local os_type=$(detect_os)
    
    if [ "$os_type" = "windows" ]; then
        print_warning "⚠️  DETECTADO: Windows"
        echo ""
        echo "💡 ORIENTAÇÕES PARA WINDOWS:"
        echo "   - Este certificado é auto-assinado e será mostrado como 'não confiável'"
        echo "   - Para desenvolvimento local, você pode ignorar o aviso de segurança"
        echo "   - Para produção, use certificados válidos de uma autoridade certificadora"
        echo "   - Se tiver problemas, execute este script no WSL"
        echo ""
        read -p "Continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_message "Geração cancelada pelo usuário"
            return 0
        fi
    fi
    
    # Gerar certificado
    if generate_ssl_cert; then
        verify_certificates
        echo ""
        print_message "✅ CERTIFICADO SSL GERADO COM SUCESSO!"
        echo ""
        print_warning "IMPORTANTE:"
        echo "   - Este certificado é auto-assinado (apenas para desenvolvimento)"
        echo "   - O navegador mostrará aviso de segurança (normal para dev)"
        echo "   - Para produção, use certificados válidos"
        echo ""
        print_info "PRÓXIMOS PASSOS:"
        echo "   1. Configure o nginx para usar os certificados"
        echo "   2. Execute: docker-compose -f docker-compose.prod.yml up"
        echo "   3. Acesse: https://localhost"
    else
        print_error "❌ FALHA NA GERAÇÃO DO CERTIFICADO"
        return 1
    fi
}

# Executar função principal
main "$@" 