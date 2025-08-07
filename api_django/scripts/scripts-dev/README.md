# 🚀 Scripts de Desenvolvimento - Sistema Django + React

Este diretório contém scripts automatizados para testar e validar seu sistema Django + React dockerizado antes de subir para produção.

## 📋 Índice

1. [Instalação e Configuração](#instalação-e-configuração)
2. [Scripts Disponíveis](#scripts-disponíveis)
3. [Como Usar](#como-usar)
4. [Troubleshooting](#troubleshooting)
5. [Automação](#automação)

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Ubuntu/Debian (testado)
- Acesso sudo
- Conexão com internet
- Projeto clonado no diretório correto

### Configuração Inicial

1. **Clone o projeto** (se ainda não fez):
```bash
git clone <seu-repositorio>
cd <diretorio-do-projeto>
```

2. **Execute o script principal**:
```bash
chmod +x scripts/scripts-dev/testa-tudo.sh
./scripts/scripts-dev/testa-tudo.sh dev
```

## 📁 Scripts Disponíveis

### 🔧 Scripts de Configuração

| Script | Descrição | Uso |
|--------|-----------|-----|
| `01-instalar-docker.sh` | Instala Docker e Docker Compose | `./01-instalar-docker.sh` |
| `02-configurar-projeto.sh` | Configura .env e SSL | `./02-configurar-projeto.sh` |
| `03-verificar-compose.sh` | Valida arquivos docker-compose | `./03-verificar-compose.sh` |

### 🚀 Scripts de Execução

| Script | Descrição | Uso |
|--------|-----------|-----|
| `04-subir-ambiente.sh` | Sobe containers | `./04-subir-ambiente.sh [dev\|prod]` |
| `05-testar-acesso.sh` | Testa conectividade | `./05-testar-acesso.sh [dev\|prod]` |

### 💾 Scripts de Backup

| Script | Descrição | Uso |
|--------|-----------|-----|
| `06-backup-local.sh` | Cria backup completo | `./06-backup-local.sh [dev\|prod]` |
| `07-restore-local.sh` | Restaura backup | `./07-restore-local.sh [dev\|prod] [backup]` |

### 🧹 Scripts de Manutenção

| Script | Descrição | Uso |
|--------|-----------|-----|
| `08-limpeza-sistema.sh` | Limpa logs e imagens | `./08-limpeza-sistema.sh [dev\|prod]` |
| `09-testes-falha.sh` | Testa resiliência | `./09-testes-falha.sh [dev\|prod]` |
| `10-checklist-final.sh` | Checklist completo | `./10-checklist-final.sh [dev\|prod]` |

### 🎯 Script Principal

| Script | Descrição | Uso |
|--------|-----------|-----|
| `testa-tudo.sh` | Executa todos os testes | `./testa-tudo.sh [dev\|prod]` |

## 🚀 Como Usar

### Opção 1: Execução Completa (Recomendado)

Execute todos os testes em sequência:

```bash
# Para ambiente de desenvolvimento
./scripts/scripts-dev/testa-tudo.sh dev

# Para ambiente de produção
./scripts/scripts-dev/testa-tudo.sh prod
```

### Opção 2: Execução Individual

Execute scripts específicos conforme necessário:

```bash
# 1. Instalar Docker
./scripts/scripts-dev/01-instalar-docker.sh

# 2. Configurar projeto
./scripts/scripts-dev/02-configurar-projeto.sh

# 3. Verificar compose
./scripts/scripts-dev/03-verificar-compose.sh

# 4. Subir ambiente
./scripts/scripts-dev/04-subir-ambiente.sh dev

# 5. Testar acesso
./scripts/scripts-dev/05-testar-acesso.sh dev

# 6. Fazer backup
./scripts/scripts-dev/06-backup-local.sh dev

# 7. Testar restore
./scripts/scripts-dev/07-restore-local.sh dev

# 8. Limpar sistema
./scripts/scripts-dev/08-limpeza-sistema.sh dev

# 9. Testes de falha
./scripts/scripts-dev/09-testes-falha.sh dev

# 10. Checklist final
./scripts/scripts-dev/10-checklist-final.sh dev
```

## 📊 O que Cada Script Faz

### 01-instalar-docker.sh
- ✅ Verifica se Docker está instalado
- 📦 Instala Docker e Docker Compose (Ubuntu)
- 🔧 Configura permissões do usuário
- 🧪 Testa funcionalidade

### 02-configurar-projeto.sh
- 📄 Cria arquivo .env a partir de env.example
- 🔐 Gera certificados SSL locais
- 📁 Verifica estrutura do projeto
- 🔐 Verifica permissões
- 🌐 Verifica conectividade

### 03-verificar-compose.sh
- 📋 Valida sintaxe dos arquivos docker-compose
- 🌐 Verifica conflitos de porta
- 💾 Verifica configuração de volumes
- 🏷️ Verifica nomes dos serviços
- 🔧 Verifica variáveis de ambiente
- 🌐 Verifica configuração de redes

### 04-subir-ambiente.sh
- 🛑 Para containers existentes
- 🧹 Limpa imagens antigas (opcional)
- 🔨 Constrói imagens
- 🚀 Sobe containers
- 🗄️ Executa migrações
- 👤 Cria superusuário (se configurado)
- 📋 Verifica logs
- 🌐 Testa conectividade

### 05-testar-acesso.sh
- 🌐 Testa frontend
- 🔧 Testa backend
- 👤 Testa admin Django
- 🔗 Testa endpoints específicos
- 🗄️ Testa conectividade com banco
- 🔴 Testa Redis (se existir)
- 🔐 Testa SSL
- ⚡ Testa performance
- 📋 Verifica logs de erro

### 06-backup-local.sh
- 🗄️ Backup do banco de dados
- 📁 Backup da pasta media
- 🔧 Backup do arquivo .env
- 📋 Cria metadados do backup
- 🗜️ Comprime backup completo
- 🔍 Verifica integridade
- 🧹 Limpa backups antigos

### 07-restore-local.sh
- 📋 Lista backups disponíveis
- 🔍 Verifica integridade do backup
- 📁 Extrai backup
- ⚠️ Confirma restauração
- 🛑 Para containers
- 🗄️ Restaura banco de dados
- 📁 Restaura arquivos de mídia
- 🚀 Sobe containers
- 🗄️ Executa migrações
- 🔍 Verifica restauração

### 08-limpeza-sistema.sh
- 💾 Verifica espaço em disco
- 📋 Limpa logs antigos
- 📦 Remove containers parados
- 🖼️ Remove imagens não utilizadas
- 💾 Remove volumes órfãos
- 🌐 Remove redes não utilizadas
- 💾 Remove backups antigos
- 📁 Remove arquivos temporários
- 🗂️ Limpa cache

### 09-testes-falha.sh
- 🗄️ Testa falha do banco de dados
- 🔧 Testa falha do backend
- 🔐 Testa falha de permissões
- 🌐 Testa falha de rede
- 💾 Testa falha de memória
- 💾 Testa falha de disco
- 🔧 Testa falha de configuração
- 📋 Testa falha de logs
- 🔐 Testa falha de SSL
- ⚡ Testa falha de performance

### 10-checklist-final.sh
- 🏗️ Verifica infraestrutura
- 🔧 Verifica configuração
- 📦 Verifica containers
- 🌐 Verifica conectividade
- 🗄️ Verifica banco de dados
- 💾 Verifica backup
- 🔐 Verifica segurança
- ⚡ Verifica performance
- 📋 Verifica logs
- 🌐 Verifica rede

## 🔧 Troubleshooting

### Problemas Comuns

#### ❌ Docker não instalado
```bash
./scripts/scripts-dev/01-instalar-docker.sh
```

#### ❌ Arquivo .env não existe
```bash
./scripts/scripts-dev/02-configurar-projeto.sh
```

#### ❌ Containers não sobem
```bash
# Verificar logs
docker-compose -f docker-compose.dev.yml logs

# Verificar configuração
./scripts/scripts-dev/03-verificar-compose.sh
```

#### ❌ Portas em uso
```bash
# Verificar portas
netstat -tuln | grep -E ":(80|8000|5432|6379|5173)"

# Parar serviços conflitantes
sudo systemctl stop apache2 nginx postgresql
```

#### ❌ Permissões de arquivo
```bash
# Corrigir permissões
sudo chown -R $USER:$USER .
chmod -R 755 .
```

#### ❌ Espaço em disco
```bash
# Limpar sistema
./scripts/scripts-dev/08-limpeza-sistema.sh dev
```

### Logs Úteis

```bash
# Logs do Docker Compose
docker-compose -f docker-compose.dev.yml logs -f

# Logs de um serviço específico
docker-compose -f docker-compose.dev.yml logs -f backend

# Logs do sistema
sudo journalctl -f

# Logs do Docker
sudo journalctl -u docker -f
```

### Comandos de Debug

```bash
# Verificar status dos containers
docker-compose -f docker-compose.dev.yml ps

# Entrar em um container
docker-compose -f docker-compose.dev.yml exec backend bash

# Verificar volumes
docker volume ls

# Verificar redes
docker network ls

# Verificar imagens
docker images
```

## 🤖 Automação

### Crontab para Backups Automáticos

Adicione ao crontab para backups automáticos:

```bash
# Backup diário às 2h da manhã
0 2 * * * /caminho/para/projeto/scripts/scripts-dev/06-backup-local.sh prod

# Limpeza semanal aos domingos às 3h
0 3 * * 0 /caminho/para/projeto/scripts/scripts-dev/08-limpeza-sistema.sh prod

# Checklist semanal às segundas às 6h
0 6 * * 1 /caminho/para/projeto/scripts/scripts-dev/10-checklist-final.sh prod
```

### Monitoramento Contínuo

```bash
# Script para monitoramento
#!/bin/bash
while true; do
    ./scripts/scripts-dev/10-checklist-final.sh prod
    sleep 3600  # Executar a cada hora
done
```

## 📊 Relatórios

Os scripts geram relatórios automáticos:

- `teste_completo_[ambiente]_[data].txt` - Relatório completo
- `backups/[ambiente]/` - Backups organizados por data
- Logs detalhados em cada script

## 🔐 Segurança

### Variáveis Críticas

Configure estas variáveis no arquivo `.env`:

```bash
# Gerar SECRET_KEY segura
python -c "import secrets; print(secrets.token_urlsafe(50))"

# Senhas fortes
POSTGRES_PASSWORD=sua_senha_forte_aqui
DJANGO_SUPERUSER_PASSWORD=sua_senha_forte_aqui
```

### Permissões

```bash
# Verificar permissões
ls -la .env
chmod 600 .env  # Apenas proprietário pode ler/escrever
```

## 📞 Suporte

### Antes de Pedir Ajuda

1. ✅ Execute `./scripts/scripts-dev/10-checklist-final.sh`
2. 📋 Verifique os logs: `docker-compose logs`
3. 🔍 Teste conectividade: `./scripts/scripts-dev/05-testar-acesso.sh`
4. 📄 Consulte este README

### Informações Úteis

- **Sistema**: `uname -a`
- **Docker**: `docker --version`
- **Compose**: `docker-compose --version`
- **Espaço**: `df -h`
- **Memória**: `free -h`

## 🎯 Objetivos

✅ **Automatizar** testes básicos de desenvolvimento  
✅ **Garantir** confiança antes do deploy  
✅ **Evitar** erros básicos de configuração  
✅ **Facilitar** uso para desenvolvedores júnior  
✅ **Documentar** processos de forma clara  
✅ **Criar** backups e restaurações seguras  
✅ **Testar** resiliência do sistema  
✅ **Monitorar** performance e logs  

---

**🎉 Seu sistema está pronto para produção quando todos os testes passarem!** 