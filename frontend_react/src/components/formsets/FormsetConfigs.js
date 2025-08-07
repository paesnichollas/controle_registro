// Configurações para todos os formsets do FormularioOS

export const formsetConfigs = {
  documentos_solicitacao: {
    title: 'Documentos da Solicitação',
    fields: [
      {
        name: 'tipo_documento_solicitacao',
        label: 'Tipo do Documento de Solicitação :',
        type: 'select',
        optionsKey: 'tiposDocumento',
        placeholder: 'Selecione o tipo'
      },
      {
        name: 'documento_solicitacao',
        label: 'Arquivo do Documento de Solicitação :',
        type: 'file'
      }
    ]
  },

  datas_previstas: {
    title: 'Datas Previstas de Entrega',
    fields: [
      {
        name: 'data_prevista_entrega',
        label: 'Data Prevista de Entrega do item :',
        type: 'datetime-local'
      },
      {
        name: 'descricao',
        label: 'Descrição : ',
        type: 'text',
        placeholder: 'Descreva a entrega'
      }
    ]
  },

  acoes_solicitacao: {
    title: 'Serviços a Executar',
    fields: [
      {
        name: 'acao_solicitacao',
        label: 'Serviço a Ser Executado :',
        type: 'select',
        optionsKey: 'acoes',
        placeholder: 'Selecione a ação'
      }
    ]
  },

  controles: {
    title: 'Controle de Qualidade',
    fields: [
      {
        name: 'tipo_cq',
        label: 'Tipo de Controle de Qualidade :',
        type: 'select',
        optionsKey: 'tipos_cq'
      },
      {
        name: 'opcoes_espec_cq',
        label: 'Especificação do Controle de Qualidade :',
        type: 'select',
        optionsKey: 'especs_cq'
      },
      {
        name: 'nivel_inspecao_cq',
        label: 'Nível de Inspeção :',
        type: 'select',
        optionsKey: 'niveis_cq'
      },
      {
        name: 'tipo_ensaio_cq',
        label: 'Tipo de Ensaio :',
        type: 'select',
        optionsKey: 'ensaios_cq'
      },
      {
        name: 'percentual_cq',
        label: 'Percentual de Inspeção :',
        type: 'select',
        optionsKey: 'percentuais',
        placeholder: '%'
      },
      {
        name: 'quantidade_cq',
        label: 'Quantidade Inspecionada :',
        type: 'number',
        placeholder: 'Informe a quantidade'
      },
      {
        name: 'tamanho_cq',
        label: 'Tamanho da Amostra :',
        type: 'number',
        step: '0.01',
        placeholder: 'Informe o tamanho'
      },
      {
        name: 'texto_tamanho_cq',
        label: 'Medida da Amostra :',
        type: 'text',
        placeholder: 'Ex: mm, cm, m'
      }
    ]
  },

  ordens: {
    title: 'Ordens do Cliente',
    fields: [
      {
        name: 'numero_ordem',
        label: 'Número da Ordem :',
        type: 'text',
        placeholder: 'Digite o número da ordem'
      }
    ]
  },

  documentos: {
    title: 'Documentos de Entrada',
    fields: [
      {
        name: 'documento_entrada',
        label: 'Arquivo do Documento de Entrada :',
        type: 'file'
      },
      {
        name: 'numero_documento_entrada',
        label: 'Número do Documento de Entrada :',
        type: 'text',
        placeholder: 'Digite o número do documento'
      },
      {
        name: 'data_documento_entrada',
        label: 'Data do Documento de Entrada :',
        type: 'datetime-local'
      }
    ]
  },

  levantamentos: {
    title: 'Levantamentos',
    fields: [
      {
        name: 'data_levantamento',
        label: 'Data do Levantamento :',
        type: 'datetime-local'
      },
      {
        name: 'arquivo_anexo_levantamento',
        label: 'Arquivo do Levantamento :',
        type: 'file'
      },
      {
        name: 'descricao_levantamento',
        label: 'Descrição do Levantamento :',
        type: 'textarea',
        placeholder: 'Descreva o levantamento realizado',
        rows: 2
      }
    ]
  },

  materiais: {
    title: 'Materiais Utilizados',
    fields: [
      {
        name: 'tipo_material',
        label: 'Tipo de Material :',
        type: 'select',
        optionsKey: 'tiposMaterial',
        placeholder: 'Selecione o tipo'
      },
      {
        name: 'status_material',
        label: 'Status do Material :',
        type: 'select',
        optionsKey: 'statusMaterial',
        placeholder: 'Selecione o status'
      },
      {
        name: 'responsavel_material',
        label: 'Responsável pelo Material :',
        type: 'select',
        optionsKey: 'responsaveisMaterial',
        placeholder: 'Selecione o responsável'
      }
    ]
  },

  gmis: {
    title: 'GMI - Guia de Movimentação Interna',
    fields: [
      {
        name: 'data_gmi',
        label: 'Data do GMI :',
        type: 'datetime-local'
      },
      {
        name: 'descricao_gmi',
        label: 'Descrição do GMI :',
        type: 'textarea',
        placeholder: 'Descreva o GMI',
        rows: 2
      },
      {
        name: 'arquivo_anexo_gmi',
        label: 'Arquivo do GMI :',
        type: 'file'
      }
    ]
  },

  gmes: {
    title: 'GME - Guia de Movimentação Externa',
    fields: [
      {
        name: 'data_gme',
        label: 'Data do GME :',
        type: 'datetime-local'
      },
      {
        name: 'descricao_gme',
        label: 'Descrição do GME :',
        type: 'textarea',
        placeholder: 'Descreva o GME',
        rows: 2
      },
      {
        name: 'arquivo_anexo_gme',
        label: 'Arquivo do GME :',
        type: 'file'
      }
    ]
  },

  rtips: {
    title: 'RTIP - Relatório Técnico de Inspeção',
    fields: [
      {
        name: 'data_rtip',
        label: 'Data do RTIP :',
        type: 'datetime-local'
      },
      {
        name: 'descricao_rtip',
        label: 'Descrição do RTIP :',
        type: 'textarea',
        placeholder: 'Descreva o RTIP',
        rows: 2
      },
      {
        name: 'arquivo_anexo_rtip',
        label: 'Arquivo do RTIP :',
        type: 'file'
      }
    ]
  },

  rtms: {
    title: 'RTM - Relatório Técnico de Manutenção',
    fields: [
      {
        name: 'data_rtm',
        label: 'Data do RTM :',
        type: 'datetime-local'
      },
      {
        name: 'descricao_rtm',
        label: 'Descrição do RTM :',
        type: 'textarea',
        placeholder: 'Descreva o RTM',
        rows: 2
      },
      {
        name: 'arquivo_anexo_rtm',
        label: 'Arquivo do RTM :',
        type: 'file'
      }
    ]
  },

  dmss: {
    title: 'Registros DMS',
    fields: [
      {
        name: 'status_dms',
        label: 'Status do DMS :',
        type: 'select',
        optionsKey: 'statusDMS',
        placeholder: 'Selecione o status'
      },
      {
        name: 'numero_dms',
        label: 'Número do DMS :',
        type: 'text',
        placeholder: 'Digite o número do DMS'
      },
      {
        name: 'data_aprovacao_dms',
        label: 'Data de Aprovação do DMS :',
        type: 'datetime-local'
      }
    ]
  },

  bmss: {
    title: 'Registros BMS',
    fields: [
      {
        name: 'status_bms',
        label: 'Status do BMS :',
        type: 'select',
        optionsKey: 'statusBMS',
        placeholder: 'Selecione o status'
      },
      {
        name: 'numero_bms',
        label: 'Número do BMS :',
        type: 'text',
        placeholder: 'Digite o número do BMS'
      },
      {
        name: 'data_aprovacao_bms',
        label: 'Data de Aprovação do BMS :',
        type: 'datetime-local'
      }
    ]
  },

  frss: {
    title: 'Registros FRS',
    fields: [
      {
        name: 'status_frs',
        label: 'Status do FRS :',
        type: 'select',
        optionsKey: 'statusFRS',
        placeholder: 'Selecione o status'
      },
      {
        name: 'numero_frs',
        label: 'Número do FRS :',
        type: 'text',
        placeholder: 'Digite o número do FRS'
      },
      {
        name: 'data_aprovacao_frs',
        label: 'Data de Aprovação do FRS :',
        type: 'datetime-local'
      }
    ]
  },

  nfsaidas: {
    title: 'Notas Fiscais de Remessa/Saída',
    fields: [
      {
        name: 'numero_nota_fiscal_remessa_saida',
        label: 'Número da Nota Fiscal de Remessa/Saída :',
        type: 'text',
        placeholder: 'Digite o número da NF'
      },
      {
        name: 'arquivo_anexo_nota_fiscal_remessa_saida',
        label: 'Arquivo da Nota Fiscal de Remessa/Saída :',
        type: 'file'
      },
      {
        name: 'data_nota_fiscal_remessa_saida',
        label: 'Data da Nota Fiscal de Remessa/Saída :',
        type: 'datetime-local'
      }
    ]
  },

  nfvendas: {
    title: 'Notas Fiscais de Venda',
    fields: [
      {
        name: 'numero_nota_fiscal_venda',
        label: 'Número da Nota Fiscal de Venda :',
        type: 'text',
        placeholder: 'Digite o número da NF'
      },
      {
        name: 'preco_nota_fiscal_venda',
        label: 'Valor da Nota Fiscal de Venda :',
        type: 'text',
        placeholder: 'Digite o valor em reais'
      },
      {
        name: 'arquivo_anexo_nota_fiscal_venda',
        label: 'Arquivo da Nota Fiscal de Venda :',
        type: 'file'
      },
      {
        name: 'data_nota_fiscal_venda',
        label: 'Data da Nota Fiscal de Venda :',
        type: 'datetime-local'
      }
    ]
  }
};

