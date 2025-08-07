"""
Sistema de webhooks simulados para a API de controle de OS
"""
import logging
import json
from datetime import datetime
from django.conf import settings
def serialize_django_object(obj):
    """Serializar objetos Django para JSON"""
    if hasattr(obj, 'pk'):
        return obj.pk
    elif hasattr(obj, '__dict__'):
        return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}
    else:
        return str(obj)



# Configurar logger específico para webhooks
logger = logging.getLogger('controle.webhooks')


def webhook_os_aprovada(os_obj):
    """
    Webhook disparado quando uma OS é aprovada
    
    Args:
        os_obj: Instância do modelo RegistroOS
    """
    webhook_data = {
        'evento': 'os_aprovada',
        'timestamp': datetime.now().isoformat(),
        'os_id': os_obj.id,
        'numero_contrato': os_obj.numero_contrato,
        'nome_cliente': os_obj.nome_cliente,
        'status_anterior': 'PENDENTE',
        'status_atual': os_obj.status_os,
        'usuario_aprovacao': os_obj.usuario.username if os_obj.usuario else None,
        'data_aprovacao': datetime.now().isoformat(),
        'valor_total': float(os_obj.saldo_final) if os_obj.saldo_final and float(os_obj.saldo_final) > 0 else float(os_obj.soma_valores) if os_obj.soma_valores else 0.0,
        'descricao': os_obj.descricao_resumida
    }
    
    # Log do webhook
    logger.info(f"WEBHOOK OS_APROVADA disparado: {json.dumps(webhook_data, default=serialize_django_object, indent=2)}")
    
    # Simular envio para sistema externo
    print(f"🔔 WEBHOOK: OS {os_obj.id} foi APROVADA!")
    print(f"   Cliente: {os_obj.nome_cliente}")
    print(f"   Contrato: {os_obj.numero_contrato}")
    print(f"   Valor: R$ {os_obj.soma_valores or 0}")
    print(f"   Aprovado por: {os_obj.usuario.username if os_obj.usuario else 'N/A'}")
    print("-" * 50)
    
    # Em produção, aqui seria feita a requisição HTTP para o endpoint do cliente
    # Exemplo:
    # import requests
    # webhook_url = "https://cliente.com/webhooks/os_aprovada"
    # requests.post(webhook_url, json=webhook_data, timeout=30)
    
    return webhook_data


def webhook_material_aprovado(material_obj):
    """
    Webhook disparado quando um material é aprovado
    
    Args:
        material_obj: Instância do modelo Material
    """
    webhook_data = {
        'evento': 'material_aprovado',
        'timestamp': datetime.now().isoformat(),
        'material_id': material_obj.id,
        'os_id': material_obj.registro.id,
        'numero_contrato': material_obj.registro.numero_contrato,
        'tipo_material': material_obj.tipo_material,
        'quantidade': float(material_obj.quantidade) if material_obj.quantidade else 0.0,
        'unidade': material_obj.unidade,
        'status_anterior': 'SOLICITADO',
        'status_atual': material_obj.status_material,
        'responsavel': material_obj.responsavel_material,
        'observacoes': material_obj.observacoes,
        'data_aprovacao': datetime.now().isoformat()
    }
    
    # Log do webhook
    logger.info(f"WEBHOOK MATERIAL_APROVADO disparado: {json.dumps(webhook_data, default=serialize_django_object, indent=2)}")
    
    # Simular envio para sistema externo
    print(f"🔔 WEBHOOK: Material {material_obj.id} foi APROVADO!")
    print(f"   OS: {material_obj.registro.numero_contrato}")
    print(f"   Material: {material_obj.tipo_material}")
    print(f"   Quantidade: {material_obj.quantidade} {material_obj.unidade}")
    print(f"   Responsável: {material_obj.responsavel_material}")
    print("-" * 50)
    
    return webhook_data


def webhook_os_concluida(os_obj):
    """
    Webhook disparado quando uma OS é concluída
    
    Args:
        os_obj: Instância do modelo RegistroOS
    """
    webhook_data = {
        'evento': 'os_concluida',
        'timestamp': datetime.now().isoformat(),
        'os_id': os_obj.id,
        'numero_contrato': os_obj.numero_contrato,
        'nome_cliente': os_obj.nome_cliente,
        'status_anterior': 'EM_EXECUCAO',
        'status_atual': os_obj.status_os,
        'data_conclusao': datetime.now().isoformat(),
        'valor_final': float(os_obj.saldo_final) if os_obj.saldo_final else 0.0,
        'materiais_utilizados': os_obj.materiais.count(),
        'documentos_gerados': {
            'levantamentos': os_obj.levantamentos.count(),
            'controles_qualidade': os_obj.controles_qualidade.count(),
            'notas_fiscais': os_obj.notas_fiscais_saida.count()
        }
    }
    
    # Log do webhook
    logger.info(f"WEBHOOK OS_CONCLUIDA disparado: {json.dumps(webhook_data, indent=2)}")
    
    # Simular envio para sistema externo
    print(f"🔔 WEBHOOK: OS {os_obj.id} foi CONCLUÍDA!")
    print(f"   Cliente: {os_obj.nome_cliente}")
    print(f"   Contrato: {os_obj.numero_contrato}")
    print(f"   Valor Final: R$ {os_obj.saldo_final or 0}")
    print(f"   Materiais: {os_obj.materiais.count()}")
    print("-" * 50)
    
    return webhook_data


def webhook_os_cancelada(os_obj, motivo=None):
    """
    Webhook disparado quando uma OS é cancelada
    
    Args:
        os_obj: Instância do modelo RegistroOS
        motivo: Motivo do cancelamento
    """
    webhook_data = {
        'evento': 'os_cancelada',
        'timestamp': datetime.now().isoformat(),
        'os_id': os_obj.id,
        'numero_contrato': os_obj.numero_contrato,
        'nome_cliente': os_obj.nome_cliente,
        'status_anterior': 'PENDENTE',
        'status_atual': os_obj.status_os,
        'motivo_cancelamento': motivo,
        'data_cancelamento': datetime.now().isoformat(),
        'valor_perdido': float(os_obj.soma_valores) if os_obj.soma_valores else 0.0
    }
    
    # Log do webhook
    logger.info(f"WEBHOOK OS_CANCELADA disparado: {json.dumps(webhook_data, indent=2)}")
    
    # Simular envio para sistema externo
    print(f"❌ WEBHOOK: OS {os_obj.id} foi CANCELADA!")
    print(f"   Cliente: {os_obj.nome_cliente}")
    print(f"   Contrato: {os_obj.numero_contrato}")
    print(f"   Motivo: {motivo or 'Não informado'}")
    print("-" * 50)
    
    return webhook_data


def webhook_material_rejeitado(material_obj, motivo=None):
    """
    Webhook disparado quando um material é rejeitado
    
    Args:
        material_obj: Instância do modelo Material
        motivo: Motivo da rejeição
    """
    webhook_data = {
        'evento': 'material_rejeitado',
        'timestamp': datetime.now().isoformat(),
        'material_id': material_obj.id,
        'os_id': material_obj.registro.id,
        'numero_contrato': material_obj.registro.numero_contrato,
        'tipo_material': material_obj.tipo_material,
        'quantidade': float(material_obj.quantidade) if material_obj.quantidade else 0.0,
        'unidade': material_obj.unidade,
        'status_anterior': 'SOLICITADO',
        'status_atual': 'REJEITADO',
        'motivo_rejeicao': motivo,
        'data_rejeicao': datetime.now().isoformat()
    }
    
    # Log do webhook
    logger.info(f"WEBHOOK MATERIAL_REJEITADO disparado: {json.dumps(webhook_data, indent=2)}")
    
    # Simular envio para sistema externo
    print(f"❌ WEBHOOK: Material {material_obj.id} foi REJEITADO!")
    print(f"   OS: {material_obj.registro.numero_contrato}")
    print(f"   Material: {material_obj.tipo_material}")
    print(f"   Motivo: {motivo or 'Não informado'}")
    print("-" * 50)
    
    return webhook_data


def webhook_teste(tipo_evento, dados_teste=None):
    """
    Função para testar webhooks manualmente
    
    Args:
        tipo_evento: Tipo do evento a ser testado
        dados_teste: Dados de teste para o webhook
    """
    webhook_data = {
        'evento': f'teste_{tipo_evento}',
        'timestamp': datetime.now().isoformat(),
        'ambiente': 'teste',
        'dados_teste': dados_teste or {},
        'versao_api': '3.0.0'
    }
    
    # Log do webhook de teste
    logger.info(f"WEBHOOK TESTE disparado: {json.dumps(webhook_data, indent=2)}")
    
    # Simular envio
    print(f"🧪 WEBHOOK TESTE: {tipo_evento}")
    print(f"   Dados: {json.dumps(dados_teste or {}, indent=2)}")
    print(f"   Timestamp: {webhook_data['timestamp']}")
    print("-" * 50)
    
    return webhook_data


def get_webhook_history():
    """
    Retorna histórico de webhooks (simulado)
    Em produção, isso viria de um banco de dados ou sistema de logs
    """
    return {
        'total_webhooks': 0,
        'webhooks_por_tipo': {
            'os_aprovada': 0,
            'material_aprovado': 0,
            'os_concluida': 0,
            'os_cancelada': 0,
            'material_rejeitado': 0
        },
        'ultimo_webhook': None,
        'status_sistema': 'ativo'
    }


def validar_webhook_config():
    """
    Valida configuração dos webhooks
    """
    config = {
        'webhooks_habilitados': True,
        'timeout_webhook': 30,
        'retry_attempts': 3,
        'log_level': 'INFO',
        'endpoints_configurados': [
            'os_aprovada',
            'material_aprovado',
            'os_concluida',
            'os_cancelada',
            'material_rejeitado'
        ]
    }
    
    logger.info(f"Configuração de webhooks validada: {json.dumps(config, indent=2)}")
    
    return config

