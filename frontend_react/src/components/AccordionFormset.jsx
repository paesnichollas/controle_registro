import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, X, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";
import { formatCurrency, parseCurrency } from '../lib/currencyUtils.js';
import { toDatetimeLocal } from '../lib/dateUtils.js';
import { openFileInNewTab, downloadFile } from '../lib/fileUtils';

/**
 * Componente para formsets com muitos campos ou linhas, encapsulando dinamicamente 
 * cada item em um accordion para melhorar a legibilidade
 * @param {Object} props
 * @param {string} props.name - Nome do formset
 * @param {string} props.title - Título do formset
 * @param {Array} props.fields - Configuração dos campos
 * @param {Array} props.value - Valor atual do formset
 * @param {Function} props.onChange - Callback para mudanças
 * @param {Function} props.isFieldRequired - Função para verificar obrigatoriedade
 * @param {Object} props.watchedValues - Valores observados do formulário
 * @param {string} props.grupo - Grupo do usuário
 * @param {Object} props.opcoes - Opções para selects
 */
export default function AccordionFormset({
  name,
  title,
  fields,
  value = [],
  onChange,
  isFieldRequired,
  watchedValues,
  grupo,
  opcoes = {}
}) {
  const [items, setItems] = useState(value.length > 0 ? value : [{}]);
  const [openItems, setOpenItems] = useState(new Set()); // Todos fechados por padrão

  // Estado para inputs de moeda (um para cada item do formset)
  const [moedaInputs, setMoedaInputs] = useState(() =>
    (value.length > 0 ? value : [{}]).map(item =>
      item.preco_nota_fiscal_venda === 0 || item.preco_nota_fiscal_venda === '' || item.preco_nota_fiscal_venda === undefined
        ? ''
        : formatCurrency(item.preco_nota_fiscal_venda)
    )
  );
  const [moedaEditing, setMoedaEditing] = useState([]); // array de bools

  // Funções utilitárias de moeda agora importadas de currencyUtils.js

  // Sincronizar items e moedaInputs sempre que value mudar
  useEffect(() => {
    if (Array.isArray(value)) {
      setItems(value.length > 0 ? value : [{}]);
      setMoedaInputs(
        (value.length > 0 ? value : [{}]).map(item =>
          item.preco_nota_fiscal_venda === 0 || item.preco_nota_fiscal_venda === '' || item.preco_nota_fiscal_venda === undefined
            ? ''
            : formatCurrency(item.preco_nota_fiscal_venda)
        )
      );
      setMoedaEditing(new Array((value.length > 0 ? value : [{}]).length).fill(false));
    }
  }, [value, name]);

  // Sincronizar moedaInputs ao adicionar/remover itens
  useEffect(() => {
    setMoedaInputs(items.map((item, idx) => {
      if (moedaEditing[idx]) {
        // Se está editando, mantém o valor atual
        return moedaInputs[idx] || '';
      }
      return item.preco_nota_fiscal_venda === 0 || item.preco_nota_fiscal_venda === '' || item.preco_nota_fiscal_venda === undefined
        ? ''
        : formatCurrency(item.preco_nota_fiscal_venda);
    }));
    setMoedaEditing(new Array(items.length).fill(false));
  }, [items.length]);

  const addItem = () => {
    const newItems = [...items, {}];
    setItems(newItems);
    onChange(newItems);
    setOpenItems(prev => new Set([...prev, newItems.length - 1]));
    setMoedaInputs(inputs => [...inputs, '']);
    setMoedaEditing(editing => [...editing, false]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      onChange(newItems);
      setOpenItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        const adjustedSet = new Set();
        newSet.forEach(i => {
          if (i < index) {
            adjustedSet.add(i);
          } else if (i > index) {
            adjustedSet.add(i - 1);
          }
        });
        return adjustedSet;
      });
      setMoedaInputs(inputs => inputs.filter((_, i) => i !== index));
      setMoedaEditing(editing => editing.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, fieldName, fieldValue) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [fieldName]: fieldValue };
    
    // Debug: log para arquivos
    if (fieldName.includes('arquivo_anexo')) {
      console.log(`AccordionFormset ${name}: ${fieldName} atualizado:`, {
        type: typeof fieldValue,
        isFile: fieldValue instanceof File,
        value: fieldValue
      });
    }
    
    setItems(newItems);
    onChange(newItems);
  };

  const handleMoedaFocus = (idx, fieldValue) => {
    setMoedaEditing(editing => editing.map((v, i) => i === idx ? true : v));
    let raw = fieldValue === 0 || fieldValue === '' || fieldValue === undefined ? '' : String(fieldValue);
    setMoedaInputs(inputs => inputs.map((v, i) => i === idx ? raw : v));
  };
  const handleMoedaBlur = (idx, value) => {
    setMoedaEditing(editing => editing.map((v, i) => i === idx ? false : v));
    let raw = parseCurrency(value);
    let number = raw === '' ? '' : Number(raw);
    setMoedaInputs(inputs => inputs.map((v, i) => i === idx ? (number === '' ? '' : formatCurrency(number)) : v));
    updateItem(idx, 'preco_nota_fiscal_venda', number);
  };
  const handleMoedaChange = (idx, value) => {
    let val = value.replace(/[^\d.,]/g, '');
    setMoedaInputs(inputs => inputs.map((v, i) => i === idx ? val : v));
  };

  const toggleItem = (index) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getItemTitle = (item) => {
    const titleField = fields.find(f => 
      f.name.includes('descricao') || 
      f.name.includes('numero') || 
      f.name.includes('nome') ||
      f.name.includes('tipo')
    );
    if (titleField && item[titleField.name]) {
      const label = titleField.label || '';
      const separator = label.trim().endsWith(':') ? ' ' : ': ';
      return `${label}${separator}${item[titleField.name]}`;
    }
    return '';
  };

  // Função para extrair texto do título (pode ser string ou JSX)
  const getTitleText = (title) => {
    if (typeof title === 'string') {
      return title;
    }
    if (React.isValidElement(title)) {
      // Se for um elemento JSX, tentar extrair o texto
      if (title.props && title.props.children) {
        if (Array.isArray(title.props.children)) {
          return title.props.children
            .map(child => {
              if (typeof child === 'string') return child;
              if (React.isValidElement(child) && child.props && child.props.children) {
                return child.props.children;
              }
              return '';
            })
            .join('')
            .trim();
        } else if (typeof title.props.children === 'string') {
          return title.props.children;
        }
      }
    }
    // Fallback: tentar converter para string
    return String(title);
  };

  // Componente de erro reutilizável com ícone
  const ErrorMessage = ({ message }) => {
    // Garantir que a mensagem seja sempre uma string válida
    let errorMessage = 'Erro de validação';
    
    if (typeof message === 'string' && message.trim() !== '') {
      errorMessage = message;
    } else if (message && typeof message === 'object') {
      if (message.message && typeof message.message === 'string') {
        errorMessage = message.message;
      } else if (message.toString && typeof message.toString === 'function') {
        errorMessage = message.toString();
      } else {
        // Se for um objeto complexo, tentar extrair informações úteis
        try {
          const keys = Object.keys(message);
          if (keys.length > 0) {
            const firstKey = keys[0];
            const firstValue = message[firstKey];
            if (Array.isArray(firstValue) && firstValue.length > 0) {
              errorMessage = firstValue[0];
            } else if (typeof firstValue === 'string') {
              errorMessage = firstValue;
            } else {
              errorMessage = JSON.stringify(message);
            }
          }
        } catch {
          errorMessage = 'Erro de validação';
        }
      }
    }
    
    return (
      <div className="flex items-center gap-1 mt-1 text-red-400 text-xs animate-in slide-in-from-top-1 duration-200">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span>{String(errorMessage)}</span>
      </div>
    );
  };

  const renderField = (field, itemIndex, item) => {
    const fieldId = `${name}_${itemIndex}_${field.name}`;
    const fieldValue = item[field.name] || '';
    
    // Classes base melhoradas com melhor contraste e feedback visual (estilo moderno)
    const baseClasses = `bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 text-sm transition-all duration-200 border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20 focus:outline-none focus:ring-2`;
    
    let options = [];
    if (field.type === 'select') {
      options = field.options || (field.optionsKey ? opcoes[field.optionsKey] : []);
    }
    
    const validOptions = (options || []).filter(opt => {
      if (typeof opt === 'object') {
        return opt && (opt.value !== undefined && opt.value !== null && opt.value !== '') && (opt.label || opt.id || opt.nome);
      }
      return typeof opt === 'string' && opt && opt !== '';
    }).map(opt => {
      if (typeof opt === 'object') {
        const result = {
          value: opt.value ?? opt.id ?? opt.nome ?? '',
          label: opt.label ?? opt.nome ?? String(opt.value ?? opt.id ?? ''),
        };
        return result;
      }
      return { value: opt, label: String(opt) };
    });
    

    switch (field.type) {
      case 'text':
        if (field.name === 'preco_nota_fiscal_venda') {
          return (
            <div className="relative">
              <Input
                id={fieldId}
                type="text"
                value={moedaInputs[itemIndex] || ''}
                onChange={e => handleMoedaChange(itemIndex, e.target.value)}
                onFocus={() => handleMoedaFocus(itemIndex, fieldValue)}
                onBlur={e => handleMoedaBlur(itemIndex, e.target.value)}
                className={baseClasses}
                placeholder={field.placeholder || 'R$ 0,00'}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
          );
        }
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type="text"
              value={fieldValue}
              onChange={(e) => updateItem(itemIndex, field.name, e.target.value)}
              className={baseClasses}
              placeholder={field.placeholder || ''}
            />
          </div>
        );

      case 'datetime-local':
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type="datetime-local"
              value={toDatetimeLocal(fieldValue)}
              onChange={(e) => updateItem(itemIndex, field.name, e.target.value)}
              className={baseClasses}
            />
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type="number"
              step={field.step || '1'}
              value={fieldValue}
              onChange={(e) => updateItem(itemIndex, field.name, e.target.value)}
              className={baseClasses}
              placeholder={field.placeholder || ''}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="relative">
            <Textarea
              id={fieldId}
              value={fieldValue}
              onChange={(e) => updateItem(itemIndex, field.name, e.target.value)}
              className={baseClasses + ' w-full'}
              placeholder={field.placeholder || ''}
              rows={field.rows || 3}
              style={{ resize: 'vertical' }}
            />
          </div>
        );

      case 'select': {
        // CORREÇÃO: Garantir que o valor seja sempre string e exista nas opções
        const selectValue = fieldValue ? String(fieldValue) : '';
        const valueExists = validOptions.some(opt => String(opt.value) === selectValue);
        
        return (
          <div className="relative">
            <Select 
              value={valueExists ? selectValue : ''} 
              onValueChange={(value) => updateItem(itemIndex, field.name, String(value))}
            >
              <SelectTrigger className={baseClasses + ((['dmss', 'bmss', 'frss'].includes(name) && (field.name === 'status_dms' || field.name === 'status_bms' || field.name === 'status_frs')) || name === 'controles' ? ' w-full' : '')}>
                <SelectValue placeholder="Selecione" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border border-slate-700">
                {validOptions.length > 0 ? validOptions.map((opt, idx) => (
                  <SelectItem key={opt.value + idx} value={String(opt.value)} className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white">{opt.label}</SelectItem>
                )) : (
                  <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case 'file':
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type="file"
              onChange={(e) => updateItem(itemIndex, field.name, e.target.files[0])}
              className={baseClasses}
              accept={field.accept || '*'}
            />
            
            {/* Exibir informações do arquivo */}
            {fieldValue && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-slate-700/50 rounded-md border border-slate-600">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 truncate">
                      {fieldValue instanceof File 
                        ? fieldValue.name 
                        : (typeof fieldValue === 'string' ? fieldValue.split('/').pop() : 'Arquivo existente')
                      }
                    </span>
                    

                  </div>
                  
                  {/* Ações para arquivo existente */}
                  {typeof fieldValue === 'string' && fieldValue && (
                    <div className="flex items-center gap-2 mt-1">
                                             <button
                         type="button"
                         onClick={() => {
                           // O backend retorna caminhos relativos, adicionar /media/ para formar URL completa
                           let fullUrl;
                           if (fieldValue.startsWith('http')) {
                             fullUrl = fieldValue;
                           } else if (fieldValue.startsWith('/media/')) {
                             // Corrigido: agora utiliza a variável de ambiente para montar a URL absoluta
                             const apiUrl = import.meta.env.VITE_API_URL;
                             fullUrl = `${apiUrl}${fieldValue}`; // Antes: apenas o caminho relativo
                           } else {
                             // Corrigido: agora utiliza a variável de ambiente para montar a URL absoluta
                             const apiUrl = import.meta.env.VITE_API_URL;
                             fullUrl = `${apiUrl}/media/${fieldValue}`; // Antes: apenas o caminho relativo
                           }
                           openFileInNewTab(fullUrl);
                         }}
                         className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors duration-200"
                         title="Visualizar arquivo"
                       >
                         👁️ Visualizar
                       </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Remover arquivo existente
                          updateItem(itemIndex, field.name, null);
                          // Limpar o input file
                          const fileInput = document.getElementById(fieldId);
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors duration-200"
                        title="Remover arquivo"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  )}
                  
                  {/* Ações para arquivo novo */}
                  {fieldValue instanceof File && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          // Remover arquivo novo
                          updateItem(itemIndex, field.name, null);
                          // Limpar o input file
                          const fileInput = document.getElementById(fieldId);
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors duration-200"
                        title="Remover arquivo"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type="text"
              value={fieldValue}
              onChange={(e) => updateItem(itemIndex, field.name, e.target.value)}
              className={baseClasses}
              placeholder={field.placeholder || ''}
            />
          </div>
        );
    }
  };

  return (
    <div className={`space-y-4 p-4 rounded-lg border transition-all duration-200 border-slate-700 bg-slate-900/50 ${name === 'controles' ? 'cq-formset-block' : ''}`}>
      {/* Header do formset com estilo moderno */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
                     <h3 className="text-lg font-semibold text-white">
             {getTitleText(title)}
             {isFieldRequired && isFieldRequired({
               field: name,
               grupo,
               values: watchedValues
             }) && <span style={{color: 'red'}}> *</span>}
           </h3>
        </div>
        <Button
          type="button"
          onClick={addItem}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 text-sm rounded-md transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Lista de itens com estilo moderno */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <Collapsible
            key={index}
            open={openItems.has(index)}
            onOpenChange={() => toggleItem(index)}
          >
            <div className="p-4 rounded-lg border transition-all duration-200 border-slate-700 bg-slate-800/50">
              {/* Header do item com estilo moderno */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center flex-1 min-w-0">
                  <CollapsibleTrigger className="flex items-center flex-1 min-w-0">
                    {openItems.has(index) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                                         <span className="text-sm font-medium text-gray-300 ml-2 truncate">
                       {getItemTitle(item) || `${getTitleText(title)} #${index + 1}`}
                     </span>
                  </CollapsibleTrigger>
                </div>
                {/* Índice sempre visível ao lado esquerdo do botão X */}
                <span className="text-white text-base font-bold mr-2">{index + 1}</span>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(index);
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-900 ml-2"
                  disabled={items.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <CollapsibleContent className="pt-0">
                <div className={['dmss', 'bmss', 'frss'].includes(name) ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : (['levantamentos', 'materiais'].includes(name) ? 'linha-formset' : (name === 'controles' ? 'cq-grid' : 'grid grid-cols-1 md:grid-cols-2 gap-4'))}>
                  {fields.map((field) => {
                    const isRequired = isFieldRequired ? isFieldRequired({
                      field: field.name,
                      grupo,
                      values: watchedValues
                    }) : false;
                    const isDescricao = field.name.includes('descricao');
                    const fieldId = `${name}_${index}_${field.name}`;
                    return (
                      <div key={field.name} className={['dmss', 'bmss', 'frss'].includes(name) ? 'flex flex-col w-full' : (['levantamentos', 'materiais'].includes(name) ? 'campo' : (name === 'controles' ? 'cq-field' : isDescricao ? 'md:col-span-2 col-span-full flex flex-col w-full' : 'space-y-2'))}>
                        <div className={name === 'controles' ? 'cq-label' : ''}>
                          <LabelObrigatorio obrigatorio={isRequired} htmlFor={fieldId} className="text-sm font-medium text-gray-300">{field.label}</LabelObrigatorio>
                        </div>
                        <div className={name === 'controles' ? 'cq-input' : ''}>
                          {renderField(field, index, item)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

