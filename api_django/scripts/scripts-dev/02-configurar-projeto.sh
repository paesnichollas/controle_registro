#!/bin/bash

# =============================================================================
# SCRIPT: 02-configurar-projeto.sh
# DESCRIÇÃO: Configura o projeto, verifica .env e gera SSL local
# USO: ./02-configurar-projeto.sh
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

echo "🔧 CONFIGURANDO PROJETO E AMBIENTE..."
echo "======================================"

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERRO: Execute este script no diretório raiz do projeto (onde está o docker-compose.yml)"
    exit 1
fi

echo "✅ Diretório do projeto verificado"

# 1. CONFIGURAR ARQUIVO .env
echo ""
echo "📋 CONFIGURANDO ARQUIVO .env..."
echo "================================"

if [ ! -f ".env" ]; then
    echo "📄 Arquivo .env não encontrado. Copiando de env.example..."
    cp env.example .env
    echo "✅ Arquivo .env criado a partir de env.example"
    
    echo ""
    echo "⚠️  ATENÇÃO: Configure as seguintes variáveis no arquivo .env:"
    echo "=============================================================="
    echo "1. SECRET_KEY: Gere uma chave secreta forte"
    echo "2. POSTGRES_PASSWORD: Senha forte para o banco de dados"
    echo "3. DJANGO_SUPERUSER_PASSWORD: Senha forte para o admin"
    echo ""
    echo "💡 DICAS DE SEGURANÇA:"
    echo "   - Use pelo menos 50 caracteres para SECRET_KEY"
    echo "   - Use senhas com pelo menos 12 caracteres"
    echo "   - Inclua letras, números e símbolos"
    echo ""
    echo "🔧 Para gerar uma SECRET_KEY segura, execute:"
    echo "   python -c \"import secrets; print(secrets.token_urlsafe(50))\""
    echo ""
    
    read -p "Deseja abrir o arquivo .env para edição? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        if command -v nano &> /dev/null; then
            nano .env
        elif command -v vim &> /dev/null; then
            vim .env
        else
            echo "📝 Abra o arquivo .env em seu editor preferido"
        fi
    fi
else
    echo "✅ Arquivo .env já existe"
fi

# 2. GERAR SSL LOCAL
echo ""
echo "🔐 GERANDO CERTIFICADOS SSL LOCAIS..."
echo "====================================="

if [ ! -d "nginx/ssl" ]; then
    echo "📁 Diretório nginx/ssl não encontrado. Criando..."
    mkdir -p nginx/ssl
    
    echo "🔑 Gerando certificados SSL locais..."
    if [ -f "scripts/generate-ssl.sh" ]; then
        chmod +x scripts/generate-ssl.sh
        ./scripts/generate-ssl.sh
        echo "✅ Certificados SSL gerados com sucesso"
    else
        echo "⚠️  Script generate-ssl.sh não encontrado. Gerando certificados manualmente..."
        
        # Gerar certificado auto-assinado
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/nginx.key \
            -out nginx/ssl/nginx.crt \
            -subj "/C=BR/ST=SP/L=Sao Paulo/O=Local Dev/CN=localhost"
        
        echo "✅ Certificados SSL gerados manualmente"
    fi
else
    echo "✅ Diretório nginx/ssl já existe"
fi

# 3. VERIFICAR ESTRUTURA DO PROJETO
echo ""
echo "📁 VERIFICANDO ESTRUTURA DO PROJETO..."
echo "======================================"

# Verificar diretórios essenciais
directories=("api_django" "frontend_react" "nginx" "scripts")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Diretório $dir encontrado"
    else
        echo "❌ Diretório $dir NÃO encontrado"
        echo "   Verifique se o projeto foi clonado corretamente"
        exit 1
    fi
done

# Verificar arquivos essenciais
files=("docker-compose.yml" "docker-compose.dev.yml" "env.example")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Arquivo $file encontrado"
    else
        echo "❌ Arquivo $file NÃO encontrado"
        echo "   Verifique se o projeto foi clonado corretamente"
        exit 1
    fi
done

# 4. VERIFICAR PERMISSÕES
echo ""
echo "🔐 VERIFICANDO PERMISSÕES..."
echo "============================"

# Verificar se o usuário está no grupo docker
if groups $USER | grep -q docker; then
    echo "✅ Usuário está no grupo docker"
else
    echo "⚠️  Usuário NÃO está no grupo docker"
    echo "   Execute: sudo usermod -aG docker $USER"
    echo "   Depois faça logout e login novamente"
fi

# Verificar permissões do diretório
if [ -w "." ]; then
    echo "✅ Permissões de escrita no diretório OK"
else
    echo "❌ Sem permissão de escrita no diretório"
    exit 1
fi

# 5. VERIFICAR CONECTIVIDADE
echo ""
echo "🌐 VERIFICANDO CONECTIVIDADE..."
echo "==============================="

# Verificar se as portas estão livres
ports=(80 8000 5432 6379 5173)
for port in "${ports[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo "⚠️  Porta $port já está em uso"
    else
        echo "✅ Porta $port está livre"
    fi
done

echo ""
echo "🎉 CONFIGURAÇÃO CONCLUÍDA!"
echo "==========================="
echo ""
echo "📋 RESUMO:"
echo "   ✅ Arquivo .env configurado"
echo "   ✅ Certificados SSL gerados"
echo "   ✅ Estrutura do projeto verificada"
echo "   ✅ Permissões verificadas"
echo "   ✅ Conectividade verificada"
echo ""
echo "🚀 PRÓXIMOS PASSOS:"
echo "   1. Configure as variáveis no arquivo .env"
echo "   2. Execute: ./03-verificar-compose.sh"
echo "   3. Execute: ./04-subir-ambiente.sh"
echo ""
echo "💡 DICA: Para verificar se tudo está configurado corretamente:"
echo "   ./scripts/scripts-dev/checklist-final.sh" 