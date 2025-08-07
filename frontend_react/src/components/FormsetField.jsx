import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";
import { translateErrorMessage } from '../lib/errorTranslator.js';
import { formatCurrency, parseCurrency } from '../lib/currencyUtils.js';
import { toDatetimeLocal } from '../lib/dateUtils.js';
import { openFileInNewTab, downloadFile } from '../lib/fileUtils';

// Componente para campo de moeda
const CurrencyField = ({ fieldId, fieldValue, fieldError, baseClasses, updateItem, itemIndex, fieldName }) => {
  // Funções utilitárias agora importadas de currencyUtils.js

  // Estado local para valor bruto e exibido
  const [inputValue, setInputValue] = useState(fieldValue === 0 || fieldValue === '' || fieldValue === undefined ? '' : formatCurrency(fieldValue));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(fieldValue === 0 || fieldValue === '' || fieldValue === undefined ? '' : formatCurrency(fieldValue));
    }
  }, [fieldValue, isEditing]);

  // Ao focar, mostrar valor bruto
  const handleFocus = (e) => {
    setIsEditing(true);
    let raw = fieldValue === 0 || fieldValue === '' || fieldValue === undefined ? '' : String(fieldValue);
    setInputValue(raw);
    e.target.select();
  };

  // Ao desfocar, aplicar máscara
  const handleBlur = (e) => {
    setIsEditing(false);
    let raw = parseCurrency(e.target.value);
    let number = raw === '' ? '' : Number(raw);
    setInputValue(number === '' ? '' : formatCurrency(number));
    // Atualiza valor bruto no formset
    updateItem(itemIndex, fieldName, number);
  };

  // Ao digitar, permitir apenas números, vírgula e ponto
  const handleChange = (e) => {
    let value = e.target.value.replace(/[^\d.,]/g, '');
    setInputValue(value);
  };

  return (
    <div className="relative">
      <Input
        id={fieldId}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={baseClasses}
        placeholder="R$ 0,00"
        inputMode="decimal"
        autoComplete="off"
      />
      {fieldError && (
        <div className="flex items-center gap-1 mt-1 text-red-400 text-xs animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{typeof fieldError === 'string' ? fieldError : 
                 (fieldError && typeof fieldError === 'object' && fieldError.message) ? fieldError.message :
                 'Erro de validação'}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Componente genérico para formsets dinâmicos com nova identidade visual
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
 * @param {Object} props.errors - Erros de validação
 */
export default function FormsetField({
  name,
  title,
  fields,
  value = [],
  onChange,
  isFieldRequired,
  watchedValues,
  grupo,
  opcoes = {},
  errors = {} // Novo prop para erros de validação
}) {
  const [items, setItems] = useState(value.length > 0 ? value : [{}]);

  // Novo: sincronizar items quando value muda (importante para edição)
  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      setItems(value);
    } else if (value && Array.isArray(value) && value.length === 0) {
      // Se value é um array vazio, manter pelo menos um item vazio
      setItems([{}]);
    }
  }, [value]);

  const addItem = () => {
    const newItems = [...items, {}];
    setItems(newItems);
    onChange(newItems);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      onChange(newItems);
    }
  };

  const updateItem = (index, fieldName, fieldValue) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [fieldName]: fieldValue };
    setItems(newItems);
    onChange(newItems);
  };

  // Função para obter erro de um campo específico com tradução
  const getFieldError = (fieldName, itemIndex) => {
    const errorKey = `${name}.${itemIndex}.${fieldName}`;
    const error = errors[errorKey] || errors[`${name}.${fieldName}`] || errors[name];
    
    // Se o erro for uma string, traduzir
    if (typeof error === 'string') {
      return translateErrorMessage(error, fieldName);
    }
    
    // Se for um array, traduzir o primeiro erro
    if (Array.isArray(error) && error.length > 0) {
      return translateErrorMessage(error[0], fieldName);
    }
    
    // Se for um objeto com propriedade message, usar a message
    if (error && typeof error === 'object' && error.message) {
      return translateErrorMessage(error.message, fieldName);
    }
    
    // Se for qualquer outro tipo de objeto, retornar null
    if (error && typeof error === 'object') {
      return null;
    }
    
    return error;
  };

  // Função para verificar se há erros no formset
  const hasFormsetError = () => {
    return Object.keys(errors).some(key => key.startsWith(name));
  };

  const renderField = (field, itemIndex, item) => {
    const fieldId = `${name}_${itemIndex}_${field.name}`;
    const fieldValue = item[field.name] || '';
    const fieldError = getFieldError(field.name, itemIndex);

    // Debug: Log para verificar o valor do campo de arquivo
    if (field.type === 'file' && fieldValue) {
      console.log(`FormsetField ${name}: Campo ${field.name}`, {
        fieldValue,
        type: typeof fieldValue,
        isFile: fieldValue instanceof File,
        isString: typeof fieldValue === 'string'
      });
    }

    // Classes base melhoradas com melhor contraste e feedback visual
    const baseClasses = `bg-slate-800 text-white border placeholder:text-gray-400 rounded-md p-2 text-sm transition-all duration-200 ${
      fieldError 
        ? 'border-red-400 focus:border-red-300 focus:ring-red-300/20' 
        : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20'
    } focus:outline-none focus:ring-2`;

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

    switch (field.type) {
      case 'text': {
        // Campo especial para preco_nota_fiscal_venda
        if (field.name === 'preco_nota_fiscal_venda') {
          return (
            <CurrencyField
              fieldId={fieldId}
              fieldValue={fieldValue}
              fieldError={fieldError}
              baseClasses={baseClasses}
              updateItem={updateItem}
              itemIndex={itemIndex}
              fieldName={field.name}
            />
          );
        }
        // Campo text padrão
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
            {fieldError && <ErrorMessage message={fieldError} />}
          </div>
        );
      }

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
            {fieldError && <ErrorMessage message={fieldError} />}
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
            {fieldError && <ErrorMessage message={fieldError} />}
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
            {fieldError && <ErrorMessage message={fieldError} />}
          </div>
        );

      case 'select': {
        const options = field.options || (field.optionsKey ? opcoes[field.optionsKey] : []);

        // Normalizar e filtrar opções inválidas
        const validOptions = (options || []).filter(opt => {
          if (typeof opt === 'object') {
            return opt && (opt.value || opt.label || opt.id || opt.nome);
          }
          return typeof opt === 'string' && opt;
        }).map(opt => {
          if (typeof opt === 'object') {
            const value = opt.value ?? opt.id ?? opt.nome;
            const label = opt.label ?? opt.nome ?? String(value ?? '');
            
            // Garantir que o valor não seja vazio
            if (!value && value !== 0) {
              return null; // Filtrar opções sem valor
            }
            
            return {
              value: String(value),
              label: String(label),
            };
          }
          
          // Para valores primitivos, garantir que não sejam vazios
          if (!opt && opt !== 0) {
            return null;
          }
          
          return { value: String(opt), label: String(opt) };
        }).filter(Boolean); // Remover opções nulas

        // CORREÇÃO: Garantir que o valor seja sempre string e exista nas opções
        const selectValue = fieldValue ? String(fieldValue) : '';
        const valueExists = validOptions.some(opt => String(opt.value) === selectValue);
        
        // Removido console.log duplicado que estava causando spam

        // Classe customizada para o select de tipo_documento_solicitacao
        const selectTriggerClass = baseClasses + ' w-full';
        return (
          <div className="relative">
            <Select 
              value={valueExists ? selectValue : ''} 
              onValueChange={(value) => updateItem(itemIndex, field.name, value)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Selecione" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border border-slate-700">
                {validOptions.length > 0 ? (
                  validOptions.map((option, index) => (
                    <SelectItem 
                      key={option.value || index}
                      value={String(option.value)}
                      className="text-white bg-slate-800 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white focus:bg-cyan-600 focus:text-white"
                    >
                      {option.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-options" disabled>Nenhuma opção disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
            {fieldError && <ErrorMessage message={fieldError} />}
          </div>
        );
      }

      case 'file':
        return (
          <div className="relative">
            <Input
              id={fieldId}
              name={`${name}[${itemIndex}].${field.name}`}
              type="file"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // Se selecionou um novo arquivo, substituir o existente
                  updateItem(itemIndex, field.name, file);
                } else {
                  // Se não selecionou nada, manter o arquivo existente (se houver)
                  // Não fazer nada para preservar o arquivo atual
                }
              }}
              className={baseClasses}
              accept={field.accept || '*'}
            />
            {fieldError && <ErrorMessage message={fieldError} />}
            

            
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
            {fieldError && <ErrorMessage message={fieldError} />}
          </div>
        );
    }
  };

  return (
    <div className={`space-y-4 p-4 rounded-lg border transition-all duration-200 ${
      hasFormsetError() 
        ? 'border-red-400/30 bg-red-950/10' 
        : 'border-slate-700 bg-slate-900/50'
    }`}>
      {/* Header do formset com indicador de erro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">
            {title}
            {isFieldRequired && isFieldRequired({
              field: name,
              grupo,
              values: watchedValues
            }) && <span style={{color: 'red'}}> *</span>}
          </h3>
          {hasFormsetError() && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-400/30 rounded-md">
              <AlertCircle className="h-3 w-3 text-red-400" />
              <span className="text-xs text-red-400">Erros encontrados</span>
            </div>
          )}
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

      {/* Lista de itens */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              Object.keys(errors).some(key => key.startsWith(`${name}.${index}`))
                ? 'border-red-400/30 bg-red-950/10' 
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            {/* Header do item */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-300">
                {title} #{index + 1}
              </h4>
              {items.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-md transition-colors duration-200"
                  title="Remover item"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Campos do item */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <LabelObrigatorio 
                    htmlFor={`${name}_${index}_${field.name}`} 
                    obrigatorio={isFieldRequired && isFieldRequired({
                      field: field.name,
                      grupo,
                      values: watchedValues
                    })}
                    className="text-sm font-medium text-gray-300"
                  >
                    {field.label}
                  </LabelObrigatorio>
                  {renderField(field, index, item)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mensagem de erro geral do formset */}
      {errors[name] && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-400/30 rounded-md animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">
            {String(
              typeof errors[name] === 'string' ? errors[name] : 
              (errors[name] && typeof errors[name] === 'object' && errors[name].message) ? errors[name].message :
              'Erro de validação'
            )}
          </span>
        </div>
      )}
    </div>
  );
}

