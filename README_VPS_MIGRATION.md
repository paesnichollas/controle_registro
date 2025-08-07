# Migração para VPS Hostinger - Controle Registro

Este documento contém todas as informações necessárias para migrar o projeto Controle Registro de Render/Vercel/Railway para uma VPS da Hostinger.

## 📋 Pré-requisitos

### VPS Hostinger
- **Sistema Operacional**: Ubuntu 20.04 LTS ou superior
- **Recursos Mínimos**: 2GB RAM, 2 vCPUs, 40GB SSD
- **Recursos Recomendados**: 4GB RAM, 4 vCPUs, 80GB SSD
- **Portas Necessárias**: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Software Necessário
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- UFW (Firewall)

## 🚀 Passo a Passo da Migração

### 1. Preparação da VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl wget git ufw

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configurar firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. Clonar o Projeto

```bash
# Clonar repositório
git clone <seu-repositorio>
cd controle-registro

# Dar permissões aos scripts
chmod +x scripts/*.sh
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp env.vps.example .env

# Editar configurações
nano .env
```

**Configurações importantes no `.env`:**
```bash
# Substitua 'seu-dominio.com' pelo seu domínio real
SECRET_KEY=sua-chave-secreta-muito-segura-aqui
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com

# Configurações do banco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua-senha-segura-aqui
DATABASE_URL=postgresql://postgres:sua-senha-segura-aqui@db:5432/controle_registro_prod

# Configurações do Redis
REDIS_PASSWORD=sua-senha-segura-aqui
REDIS_URL=redis://:sua-senha-segura-aqui@redis:6379/0

# URLs do frontend
VITE_API_URL=https://seu-dominio.com/api
VITE_AUTH_URL=https://seu-dominio.com/api/auth
```

### 4. Configurar Certificados SSL

#### Opção A: Let's Encrypt (Recomendado)
```bash
# Instalar Certbot
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*
```

#### Opção B: Certificados Auto-assinados (Desenvolvimento)
```bash
# O script de deploy criará automaticamente
```

### 5. Executar Deploy

```bash
# Executar deploy completo
./scripts/deploy-vps.sh
```

## 🔧 Configurações Específicas da VPS

### Docker Compose VPS
O arquivo `docker-compose.vps.yml` contém configurações otimizadas para VPS:

- **Segurança**: Portas restritas apenas para localhost
- **Performance**: Configurações otimizadas de workers e timeouts
- **Monitoramento**: Health checks para todos os serviços
- **Persistência**: Volumes nomeados para dados

### Nginx VPS
O arquivo `nginx/nginx.vps.conf` inclui:

- **SSL/TLS**: Configuração completa para HTTPS
- **Rate Limiting**: Proteção contra ataques
- **Compressão**: Gzip para melhor performance
- **Cache**: Headers de cache otimizados
- **Segurança**: Headers de segurança

### Django Settings
Configurações adaptadas para VPS:

- **Database**: Pool de conexões otimizado
- **Cache**: Redis com autenticação
- **CORS**: Configuração para domínio local
- **Logging**: Logs estruturados

## 📊 Scripts de Automação

### Deploy (`scripts/deploy-vps.sh`)
- Verificação de pré-requisitos
- Backup automático antes do deploy
- Build e inicialização de serviços
- Health checks
- Configuração de firewall

### Backup (`scripts/backup-vps.sh`)
- Backup do banco PostgreSQL
- Backup de arquivos de mídia
- Backup de arquivos estáticos
- Backup de configurações
- Limpeza automática de backups antigos

### Monitoramento (`scripts/monitor-vps.sh`)
- Verificação de recursos do sistema
- Status dos containers Docker
- Saúde dos serviços
- Logs de erro
- Certificados SSL
- Relatórios automáticos

## 🔄 Comandos Úteis

### Gerenciamento de Serviços
```bash
# Iniciar todos os serviços
docker-compose -f docker-compose.vps.yml up -d

# Parar todos os serviços
docker-compose -f docker-compose.vps.yml down

# Ver logs
docker-compose -f docker-compose.vps.yml logs -f

# Reiniciar serviços
docker-compose -f docker-compose.vps.yml restart
```

### Backup e Restore
```bash
# Backup manual
./scripts/backup-vps.sh

# Backup do banco
docker-compose -f docker-compose.vps.yml exec db pg_dump -U postgres controle_registro_prod > backup.sql

# Restore do banco
docker-compose -f docker-compose.vps.yml exec -T db psql -U postgres controle_registro_prod < backup.sql
```

### Monitoramento
```bash
# Verificar status
./scripts/monitor-vps.sh

# Ver logs específicos
docker-compose -f docker-compose.vps.yml logs -f backend
docker-compose -f docker-compose.vps.yml logs -f frontend
docker-compose -f docker-compose.vps.yml logs -f nginx
```

## 🔒 Segurança

### Firewall
- Porta 22 (SSH): Acesso remoto
- Porta 80 (HTTP): Redirecionamento para HTTPS
- Porta 443 (HTTPS): Acesso principal
- Portas 5432 (PostgreSQL) e 6379 (Redis): Bloqueadas externamente

### Certificados SSL
- Renovação automática com Let's Encrypt
- Configuração de segurança TLS 1.2+
- Headers de segurança HSTS

### Variáveis de Ambiente
- Senhas fortes para PostgreSQL e Redis
- SECRET_KEY única e segura
- Configurações de domínio específicas

## 📈 Performance

### Otimizações Implementadas
- **Gunicorn**: 4 workers com timeout otimizado
- **Nginx**: Compressão gzip e cache
- **PostgreSQL**: Pool de conexões configurado
- **Redis**: Cache com autenticação
- **Docker**: Volumes nomeados para persistência

### Monitoramento
- Health checks automáticos
- Logs estruturados
- Relatórios de performance
- Alertas de recursos

## 🚨 Troubleshooting

### Problemas Comuns

#### Serviços não iniciam
```bash
# Verificar logs
docker-compose -f docker-compose.vps.yml logs

# Verificar espaço em disco
df -h

# Verificar memória
free -h
```

#### Certificados SSL
```bash
# Verificar certificados
openssl x509 -in ssl/cert.pem -text -noout

# Renovar certificados Let's Encrypt
sudo certbot renew
```

#### Banco de dados
```bash
# Verificar conexão
docker-compose -f docker-compose.vps.yml exec db pg_isready -U postgres

# Verificar logs
docker-compose -f docker-compose.vps.yml logs db
```

## 📞 Suporte

### Logs Importantes
- **Django**: `logs/django.log`
- **Nginx**: `logs/nginx/access.log`, `logs/nginx/error.log`
- **Docker**: `docker-compose -f docker-compose.vps.yml logs`

### Comandos de Diagnóstico
```bash
# Status geral
./scripts/monitor-vps.sh

# Verificar recursos
htop
df -h
free -h

# Verificar conectividade
curl -I https://seu-dominio.com
```

## 🔄 Atualizações

### Deploy de Atualizações
```bash
# Fazer backup
./scripts/backup-vps.sh

# Atualizar código
git pull origin main

# Rebuild e restart
docker-compose -f docker-compose.vps.yml down
docker-compose -f docker-compose.vps.yml up -d --build

# Verificar saúde
./scripts/monitor-vps.sh
```

### Backup Automático
Configure cron para backups automáticos:
```bash
# Adicionar ao crontab
crontab -e

# Backup diário às 2h da manhã
0 2 * * * /caminho/para/projeto/scripts/backup-vps.sh

# Monitoramento a cada hora
0 * * * * /caminho/para/projeto/scripts/monitor-vps.sh
```

## ✅ Checklist de Migração

- [ ] VPS configurada com Ubuntu 20.04+
- [ ] Docker e Docker Compose instalados
- [ ] Firewall configurado
- [ ] Projeto clonado
- [ ] Arquivo `.env` configurado
- [ ] Certificados SSL configurados
- [ ] Deploy executado com sucesso
- [ ] Health checks passando
- [ ] Backup inicial realizado
- [ ] Monitoramento configurado
- [ ] Domínio apontando para VPS
- [ ] Testes de funcionalidade realizados

## 🎯 Próximos Passos

1. **Configurar domínio** no painel da Hostinger
2. **Configurar DNS** para apontar para o IP da VPS
3. **Testar aplicação** em produção
4. **Configurar backups automáticos**
5. **Configurar monitoramento contínuo**
6. **Documentar procedimentos** de manutenção

---

**Nota**: Este projeto está otimizado para VPS da Hostinger com todas as configurações de segurança e performance necessárias para um ambiente de produção.
