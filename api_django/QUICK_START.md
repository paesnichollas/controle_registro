# 🚀 Guia de Início Rápido - Containerização

Este guia mostra como containerizar e fazer deploy dos projetos backend Django e frontend React.

## 📁 Estrutura Criada

```
.
├── api_django/
│   ├── Dockerfile                    # Container do backend Django
│   ├── docker-entrypoint.sh         # Script de inicialização
│   └── .dockerignore                # Arquivos ignorados no build
├── frontend_react/
│   ├── Dockerfile                   # Container do frontend (produção)
│   ├── Dockerfile.dev               # Container do frontend (desenvolvimento)
│   ├── nginx.conf                   # Configuração do nginx
│   └── .dockerignore                # Arquivos ignorados no build
├── nginx/
│   ├── nginx.conf                   # Configuração nginx para produção
│   └── ssl/                         # Certificados SSL
├── scripts/
│   └── generate-ssl.sh              # Script para gerar certificados SSL
├── docker-compose.yml               # Configuração principal
├── docker-compose.dev.yml           # Configuração para desenvolvimento
├── docker-compose.prod.yml          # Configuração para produção
├── docker-compose.monitoring.yml    # Configuração para monitoramento
├── deploy.sh                        # Script de deploy automatizado
├── env.example                      # Exemplo de variáveis de ambiente
├── README_DOCKER.md                 # Documentação completa
└── QUICK_START.md                   # Este arquivo
```

## ⚡ Deploy Rápido

### 1. Configuração Inicial

```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar variáveis de ambiente
nano .env
```

### 2. Deploy Automatizado

```bash
# Dar permissão ao script
chmod +x deploy.sh

# Fazer deploy completo
./deploy.sh deploy
```

### 3. Verificar Status

```bash
# Ver status dos containers
./deploy.sh status

# Ver logs
./deploy.sh logs
```

## 🔧 Comandos Úteis

### Desenvolvimento
```bash
# Subir ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Ver logs de desenvolvimento
docker-compose -f docker-compose.dev.yml logs -f
```

### Produção
```bash
# Gerar certificados SSL (desenvolvimento)
./scripts/generate-ssl.sh

# Subir ambiente de produção
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoramento
```bash
# Subir ferramentas de monitoramento
docker-compose -f docker-compose.monitoring.yml up -d
```

## 🌐 URLs de Acesso

### Desenvolvimento
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin

### Produção
- **Frontend**: http://localhost (ou https://localhost)
- **Backend API**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin

### Monitoramento
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8080

## 🔒 Configurações de Segurança

### Variáveis de Ambiente Importantes

```bash
# Banco de dados
POSTGRES_PASSWORD=sua_senha_segura

# Django
SECRET_KEY=sua_chave_secreta_muito_segura
DEBUG=False

# Superusuário
CREATE_SUPERUSER=true
DJANGO_SUPERUSER_PASSWORD=senha_admin_segura
```

### Para Produção

1. **Alterar senhas padrão**
2. **Configurar certificados SSL válidos**
3. **Configurar firewall**
4. **Implementar backup automático**

## 🛠️ Troubleshooting

### Problemas Comuns

1. **Porta já em uso**
   ```bash
   # Verificar portas
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8000
   ```

2. **Erro de permissão**
   ```bash
   # Dar permissão aos scripts
   chmod +x deploy.sh
   chmod +x scripts/generate-ssl.sh
   ```

3. **Container não inicia**
   ```bash
   # Ver logs detalhados
   docker-compose logs backend
   docker-compose logs frontend
   ```

### Comandos de Debug

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Acessar container
docker-compose exec backend bash
docker-compose exec frontend sh

# Reconstruir containers
docker-compose up -d --build
```

## 📊 Monitoramento

### Métricas Importantes

- **CPU e Memória**: Grafana + Prometheus
- **Logs**: `docker-compose logs -f`
- **Performance**: cAdvisor
- **Sistema**: Node Exporter

### Alertas Recomendados

- Uso de CPU > 80%
- Uso de memória > 85%
- Espaço em disco > 90%
- Containers parados
- Erros de aplicação

## 🔄 Atualizações

### Atualizar Aplicação

```bash
# Parar containers
docker-compose down

# Pull das mudanças
git pull

# Reconstruir e subir
docker-compose up -d --build
```

### Backup

```bash
# Backup do banco
docker-compose exec db pg_dump -U postgres controle_os > backup.sql

# Backup dos volumes
docker run --rm -v controle-os_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## 📞 Suporte

### Logs Úteis

```bash
# Logs do backend
docker-compose logs backend

# Logs do frontend
docker-compose logs frontend

# Logs do nginx
docker-compose logs nginx

# Logs do banco
docker-compose logs db
```

### Recursos

- **Documentação completa**: `README_DOCKER.md`
- **Script de deploy**: `./deploy.sh`
- **Configurações**: `docker-compose*.yml`

---

**Próximos passos**:
1. Configure as variáveis de ambiente no arquivo `.env`
2. Execute `./deploy.sh deploy`
3. Acesse http://localhost para verificar o frontend
4. Acesse http://localhost:8000/admin para configurar o Django

**Para produção**:
1. Configure certificados SSL válidos
2. Ajuste as configurações de segurança
3. Implemente backup automático
4. Configure monitoramento 