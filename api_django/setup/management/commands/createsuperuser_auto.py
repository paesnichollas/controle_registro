from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import IntegrityError


class Command(BaseCommand):
    help = 'Cria automaticamente um superuser "admin" com senha "metaltec1234"'

    def handle(self, *args, **options):
        username = 'admin'
        email = 'admin@metaltec.com'
        password = 'metaltec1234'
        
        try:
            # Verifica se o usuário já existe
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'Usuário "{username}" já existe. Pulando criação.')
                )
                return
            
            # Cria o superuser
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Superuser "{username}" criado com sucesso!\n'
                    f'Email: {email}\n'
                    f'Senha: {password}'
                )
            )
            
        except IntegrityError as e:
            self.stdout.write(
                self.style.ERROR(f'Erro ao criar superuser: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erro inesperado: {e}')
            ) 