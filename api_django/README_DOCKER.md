# Containerização e Deploy - Sistema de Controle de OS

Este documento descreve o processo de containerização e deploy dos projetos backend Django e frontend React.

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Git para clonar o repositório
- Acesso ao terminal/linha de comando

## 🏗️ Estrutura dos Containers

### Backend Django (`api_django/`)
- **Imagem base**: `python:3.11-slim`
- **Servidor**: Gunicorn
- **Porta**: 8000
- **Banco de dados**: PostgreSQL

### Frontend React (`frontend_react/`)
- **Imagem base**: `node:18-alpine` (build) + `nginx:alpine` (produção)
- **Servidor**: Nginx
- **Porta**: 80
- **Proxy**: Configurado para redirecionar `/api/*` para o backend

### Banco de Dados
- **Imagem**: `postgres:15-alpine`
- **Porta**: 5432
- **Persistência**: Volume Docker

### Cache (Opcional)
- **Imagem**: `redis:7-alpine`
- **Porta**: 6379

## 🚀 Processo de Deploy

### 1. Configuração Inicial

```bash
# Clonar o repositório (se aplicável)
git clone <repository-url>
cd <project-directory>

# Copiar arquivo de exemplo de variáveis de ambiente
cp env.example .env

# Editar as variáveis de ambiente
nano .env
```

### 2. Configuração das Variáveis de Ambiente

Edite o arquivo `.env` com as seguintes configurações:

```bash
# Configurações do Banco de Dados
POSTGRES_DB=controle_os
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_segura

# Configurações do Django
DEBUG=False
SECRET_KEY=sua_chave_secreta_muito_segura
ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com

# Configurações de Superusuário (opcional)
CREATE_SUPERUSER=true
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@exemplo.com
DJANGO_SUPERUSER_PASSWORD=senha_admin_segura
```

### 3. Construção das Imagens

```bash
# Construir todas as imagens
docker-compose build

# Ou construir uma imagem específica
docker-compose build backend
docker-compose build frontend
```

### 4. Subir os Containers

```bash
# Subir todos os serviços em segundo plano
docker-compose up -d

# Verificar status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Verificação e Testes

```bash
# Verificar se todos os containers estão rodando
docker-compose ps

# Testar o backend
curl http://localhost:8000/api/

# Testar o frontend
curl http://localhost:80

# Verificar logs de erro
docker-compose logs backend | grep ERROR
docker-compose logs frontend | grep ERROR
```

## 🔧 Comandos Úteis

### Gerenciamento de Containers

```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados do banco)
docker-compose down -v

# Reiniciar um serviço específico
docker-compose restart backend

# Reconstruir e subir um serviço
docker-compose up -d --build backend
```

### Acesso aos Containers

```bash
# Acessar shell do backend
docker-compose exec backend bash

# Acessar shell do frontend
docker-compose exec frontend sh

# Executar comando Django
docker-compose exec backend python manage.py shell

# Ver logs do banco
docker-compose logs db
```

### Backup e Restore

```bash
# Backup do banco de dados
docker-compose exec db pg_dump -U postgres controle_os > backup.sql

# Restore do banco de dados
docker-compose exec -T db psql -U postgres controle_os < backup.sql
```

## 🛠️ Troubleshooting

### Problemas Comuns

1. **Porta já em uso**
   ```bash
   # Verificar portas em uso
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8000
   
   # Parar serviços conflitantes ou alterar portas no docker-compose.yml
   ```

2. **Erro de permissão no script de entrada**
   ```bash
   # Dar permissão de execução
   chmod +x api_django/docker-entrypoint.sh
   ```

3. **Problemas de conectividade entre containers**
   ```bash
   # Verificar rede Docker
   docker network ls
   docker network inspect <project-name>_app-network
   ```

4. **Erro de migração do Django**
   ```bash
   # Executar migrações manualmente
   docker-compose exec backend python manage.py migrate
   
   # Verificar status das migrações
   docker-compose exec backend python manage.py showmigrations
   ```

### Logs de Debug

```bash
# Ver logs detalhados
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend

# Ver logs de erro
docker-compose logs backend | grep -i error
docker-compose logs frontend | grep -i error
```

## 🔒 Configurações de Segurança

### Para Produção

1. **Alterar senhas padrão**
   - POSTGRES_PASSWORD
   - SECRET_KEY
   - DJANGO_SUPERUSER_PASSWORD

2. **Configurar HTTPS**
   - Adicionar certificados SSL
   - Configurar proxy reverso (nginx/traefik)

3. **Configurar firewall**
   - Abrir apenas portas necessárias
   - Restringir acesso ao banco de dados

4. **Configurar backups automáticos**
   - Script de backup do banco
   - Backup dos volumes Docker

## 📊 Monitoramento

### Verificar Status dos Serviços

```bash
# Status geral
docker-compose ps

# Uso de recursos
docker stats

# Logs em tempo real
docker-compose logs -f --tail=50
```

### Métricas Importantes

- **Backend**: Tempo de resposta da API
- **Frontend**: Tempo de carregamento das páginas
- **Banco**: Conexões ativas e performance
- **Redis**: Hit rate do cache

## 🚀 Deploy em Produção

### 1. Preparação do Servidor

```bash
# Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configuração de Produção

```bash
# Criar diretório do projeto
mkdir -p /opt/controle-os
cd /opt/controle-os

# Copiar arquivos do projeto
# Configurar .env para produção
# Ajustar ALLOWED_HOSTS e outras variáveis
```

### 3. Deploy

```bash
# Construir e subir
docker-compose -f docker-compose.yml up -d --build

# Verificar status
docker-compose ps
docker-compose logs -f
```

### 4. Configuração de Proxy Reverso (Opcional)

Para usar com nginx como proxy reverso:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📝 Notas Importantes

1. **Volumes**: Os dados do banco e arquivos de mídia são persistidos em volumes Docker
2. **Networks**: Todos os containers estão na mesma rede para comunicação interna
3. **Environment**: Use o arquivo `.env` para configurar variáveis de ambiente
4. **Logs**: Configure rotação de logs para produção
5. **Backup**: Implemente backup automático do banco de dados

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
# Parar containers
docker-compose down

# Pull das últimas mudanças (se usando git)
git pull

# Reconstruir e subir
docker-compose up -d --build

# Verificar logs
docker-compose logs -f
```

## 📞 Suporte

Em caso de problemas:

1. Verificar logs: `docker-compose logs -f`
2. Verificar status: `docker-compose ps`
3. Verificar recursos: `docker stats`
4. Verificar redes: `docker network ls`

---

**Última atualização**: $(date)
**Versão**: 1.0.0 