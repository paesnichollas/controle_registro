# 🪟 Guia de Configuração para Windows

Este guia foi criado especificamente para desenvolvedores que estão usando **Windows** com **Git Bash** ou **WSL** para rodar o projeto Django + React dockerizado.

## 📋 Pré-requisitos

### 1. Instalar Dependências

**Docker Desktop:**
- Baixe e instale: https://docs.docker.com/desktop/install/windows/
- Inicie o Docker Desktop
- Verifique se está rodando: `docker --version`

**Git Bash:**
- Baixe e instale: https://git-scm.com/download/win
- Use Git Bash em vez do CMD ou PowerShell

**WSL (Recomendado):**
- Execute no PowerShell como administrador: `wsl --install`
- Reinicie o computador
- Instale Ubuntu no WSL

### 2. Verificar Instalação

Execute este comando para verificar se tudo está funcionando:

```bash
./scripts/windows-compatibility.sh
```

## 🚀 Primeiros Passos

### 1. Navegar para o Projeto

**No Git Bash:**
```bash
# Navegar de D:\ para /d/
cd /d/Projetos/Metaltec/api/api-back/api_django
```

**No WSL:**
```bash
# Navegar de D:\ para /mnt/d/
cd /mnt/d/Projetos/Metaltec/api/api-back/api_django
```

### 2. Configurar Variáveis de Ambiente

```bash
# 1. Copiar arquivo de exemplo
cp env.example .env

# 2. Gerar valores seguros automaticamente
./scripts/10-generate-secrets.sh -e

# 3. Verificar se as variáveis estão corretas
./scripts/check-required-vars.sh
```

### 3. Configurar Git (se necessário)

```bash
# Dar permissão de execução aos scripts
git update-index --chmod=+x scripts/*.sh

# Ou individualmente:
git update-index --chmod=+x scripts/windows-compatibility.sh
git update-index --chmod=+x scripts/check-required-vars.sh
```

## 🔧 Comandos Adaptados para Windows

### Problemas Comuns e Soluções

**1. Comando `find` não encontrado:**
```bash
# Use grep em vez de find
grep -r "texto" . --include="*.py"
```

**2. Comando `bc` não encontrado:**
```bash
# Use awk para cálculos
echo "10/3" | awk '{printf "%.2f", $1}'
```

**3. Comando `sudo` não encontrado:**
- Execute Git Bash como administrador
- Ou use WSL onde sudo funciona normalmente

**4. Problemas de permissão:**
```bash
# Para scripts
git update-index --chmod=+x script.sh

# Para executar
bash script.sh
```

## 📁 Estrutura de Pastas no Windows

```
D:\Projetos\Metaltec\api\api-back\api_django\
├── api_django/          # Backend Django
├── frontend_react/      # Frontend React
├── scripts/            # Scripts de automação
├── docker-compose.yml  # Configuração Docker
└── .env               # Variáveis de ambiente
```

**No Git Bash:**
```
/d/Projetos/Metaltec/api/api-back/api_django/
```

**No WSL:**
```
/mnt/d/Projetos/Metaltec/api/api-back/api_django/
```

## 🐳 Executar com Docker

### Ambiente de Desenvolvimento

```bash
# 1. Verificar compatibilidade
./scripts/windows-compatibility.sh

# 2. Verificar variáveis
./scripts/check-required-vars.sh

# 3. Subir containers
docker-compose -f docker-compose.dev.yml up --build

# 4. Acessar aplicação
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

### Ambiente de Produção

```bash
# 1. Gerar certificado SSL
./scripts/generate-ssl.sh

# 2. Subir containers de produção
docker-compose -f docker-compose.prod.yml up --build

# 3. Acessar aplicação
# https://localhost (com certificado auto-assinado)
```

## 🔐 Configuração de Segurança

### Variáveis Obrigatórias

Sempre configure estas variáveis no arquivo `.env`:

```bash
# Django
SECRET_KEY=sua-chave-secreta-muito-longa-aqui

# Banco de dados
POSTGRES_PASSWORD=sua-senha-forte-aqui

# Superusuário
DJANGO_SUPERUSER_PASSWORD=sua-senha-admin-aqui
```

### Gerar Valores Seguros

```bash
# Gerar automaticamente
./scripts/10-generate-secrets.sh -e

# Ou manualmente
./scripts/10-generate-secrets.sh
```

## 🛠️ Scripts de Automação

### Scripts Principais

```bash
# Verificar ambiente
./scripts/windows-compatibility.sh

# Verificar variáveis
./scripts/check-required-vars.sh

# Gerar certificado SSL
./scripts/generate-ssl.sh

# Gerar senhas seguras
./scripts/10-generate-secrets.sh

# Backup do banco
./scripts/04-backup-db.sh

# Restaurar banco
./scripts/08-restore-db.sh
```

### Executar Scripts

**Sempre use:**
```bash
bash script.sh
```

**Em vez de:**
```bash
./script.sh  # Pode dar erro de permissão no Windows
```

## 🚨 Problemas Comuns

### 1. "Permission denied" ao executar scripts

**Solução:**
```bash
# Dar permissão via Git
git update-index --chmod=+x scripts/*.sh

# Ou executar com bash
bash scripts/script.sh
```

### 2. Docker não está rodando

**Solução:**
- Abra o Docker Desktop
- Aguarde até aparecer "Docker Desktop is running"
- Execute Git Bash como administrador

### 3. Erro de caminho no docker-compose

**Solução:**
- Verifique se está no diretório correto
- Use caminhos relativos (já corrigidos nos arquivos)

### 4. Certificado SSL não confiável

**Solução:**
- É normal para desenvolvimento
- Clique em "Avançado" → "Continuar para localhost"
- Para produção, use certificados válidos

### 5. Variáveis de ambiente não carregadas

**Solução:**
```bash
# Verificar se o arquivo .env existe
ls -la .env

# Verificar variáveis obrigatórias
./scripts/check-required-vars.sh

# Gerar valores seguros se necessário
./scripts/10-generate-secrets.sh -e
```

## 📞 Suporte

### Logs e Debug

```bash
# Ver logs dos containers
docker-compose logs

# Ver logs de um serviço específico
docker-compose logs backend
docker-compose logs frontend

# Ver logs em tempo real
docker-compose logs -f
```

### Verificar Status

```bash
# Status dos containers
docker-compose ps

# Informações do sistema
docker system info

# Uso de recursos
docker stats
```

## 🎯 Checklist Final

Antes de começar a desenvolver, verifique:

- [ ] Docker Desktop está rodando
- [ ] Git Bash ou WSL instalado
- [ ] Arquivo `.env` configurado
- [ ] Variáveis obrigatórias preenchidas
- [ ] Scripts com permissão de execução
- [ ] Containers subindo sem erro
- [ ] Aplicação acessível no navegador

## 💡 Dicas para Desenvolvedores Júnior

1. **Sempre use Git Bash** em vez do CMD
2. **Execute scripts com `bash`** em vez de `./`
3. **Verifique o ambiente** antes de começar
4. **Leia as mensagens de erro** com atenção
5. **Use os scripts de verificação** regularmente
6. **Mantenha o Docker Desktop atualizado**
7. **Faça backup regular** das configurações

## 🔄 Atualizações

Para atualizar o projeto:

```bash
# Atualizar código
git pull origin main

# Reconstruir containers
docker-compose -f docker-compose.dev.yml up --build

# Verificar se tudo funciona
./scripts/windows-compatibility.sh
```

---

**🎉 Parabéns!** Seu ambiente Windows está configurado e pronto para desenvolvimento!
