#!/bin/bash

# Script de entrada para o container Django

# Função para aguardar o banco de dados
wait_for_db() {
    echo "Aguardando banco de dados..."
    while ! python manage.py check --database default 2>&1; do
        sleep 1
    done
    echo "Banco de dados pronto!"
}

# Função para executar migrações
run_migrations() {
    echo "Executando migrações..."
    python manage.py migrate --noinput
}

# Função para criar superusuário se necessário
create_superuser() {
    if [ "$CREATE_SUPERUSER" = "true" ]; then
        echo "Criando superusuário..."
        python manage.py createsuperuser --noinput || true
    fi
}

# Função para coletar arquivos estáticos
collect_static() {
    echo "Coletando arquivos estáticos..."
    python manage.py collectstatic --noinput
}

# Função principal
main() {
    # Aguardar banco de dados
    wait_for_db
    
    # Executar migrações
    run_migrations
    
    # Criar superusuário se necessário
    create_superuser
    
    # Coletar arquivos estáticos
    collect_static
    
    # Iniciar servidor
    echo "Iniciando servidor Django..."
    exec gunicorn setup.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
}

# Executar função principal
main 