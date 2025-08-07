#!/bin/bash

# =============================================================================
# SCRIPT: 01-instalar-docker.sh
# DESCRIÇÃO: Verifica se Docker e Docker Compose estão instalados e instala se necessário
# USO: ./01-instalar-docker.sh
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

echo "🔍 VERIFICANDO INSTALAÇÃO DO DOCKER E DOCKER COMPOSE..."
echo "=================================================="

# Função para verificar se um comando existe
check_command() {
    if command -v "$1" &> /dev/null; then
        echo "✅ $1 está instalado"
        return 0
    else
        echo "❌ $1 NÃO está instalado"
        return 1
    fi
}

# Verificar se estamos no Ubuntu/Debian
if ! grep -q "Ubuntu\|Debian" /etc/os-release 2>/dev/null; then
    echo "⚠️  ATENÇÃO: Este script foi testado no Ubuntu/Debian."
    echo "   Para outros sistemas, consulte a documentação oficial do Docker."
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Instalação cancelada pelo usuário."
        exit 1
    fi
fi

# Verificar Docker
docker_installed=false
if check_command docker; then
    docker_installed=true
    echo "📋 Versão do Docker:"
    docker --version
fi

# Verificar Docker Compose
compose_installed=false
if check_command docker-compose; then
    compose_installed=true
    echo "📋 Versão do Docker Compose:"
    docker-compose --version
fi

# Se ambos estão instalados
if [ "$docker_installed" = true ] && [ "$compose_installed" = true ]; then
    echo ""
    echo "🎉 DOCKER E DOCKER COMPOSE JÁ ESTÃO INSTALADOS!"
    echo "=================================================="
    echo "✅ Docker: $(docker --version)"
    echo "✅ Docker Compose: $(docker-compose --version)"
    echo ""
    echo "🧪 TESTANDO FUNCIONALIDADE..."
    
    # Testar se o Docker está funcionando
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker está funcionando corretamente"
    else
        echo "❌ Docker não está funcionando. Execute: sudo usermod -aG docker $USER"
        echo "   Depois faça logout e login novamente."
        exit 1
    fi
    
    echo ""
    echo "🚀 PRONTO PARA USAR! Você pode executar os próximos scripts."
    exit 0
fi

# Se não estão instalados, instalar
echo ""
echo "📦 INSTALANDO DOCKER E DOCKER COMPOSE..."
echo "=========================================="

# Atualizar repositórios
echo "🔄 Atualizando repositórios..."
sudo apt-get update

# Instalar dependências
echo "📦 Instalando dependências..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Adicionar chave GPG oficial do Docker
echo "🔑 Adicionando chave GPG do Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório do Docker
echo "📋 Adicionando repositório do Docker..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Atualizar repositórios novamente
sudo apt-get update

# Instalar Docker
echo "🐳 Instalando Docker..."
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Instalar Docker Compose
echo "📦 Instalando Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Adicionar usuário ao grupo docker
echo "👤 Adicionando usuário ao grupo docker..."
sudo usermod -aG docker $USER

echo ""
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "========================="
echo ""
echo "⚠️  IMPORTANTE: Faça logout e login novamente para que as permissões do Docker funcionem."
echo "   Ou execute: newgrp docker"
echo ""
echo "🧪 Para testar após o logout/login:"
echo "   docker run hello-world"
echo ""
echo "📋 Versões instaladas:"
docker --version
docker-compose --version

echo ""
echo "🎉 DOCKER INSTALADO COM SUCESSO!"
echo "=================================="
echo "Próximo passo: Execute o script 02-configurar-projeto.sh" 