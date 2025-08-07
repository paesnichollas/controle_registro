import React, { useState } from 'react';
import { perfilAPI } from '../lib/api.jsx';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";
import { useNotification } from '../contexts/NotificationContext.jsx';

const schema = yup.object().shape({
  senha_atual: yup.string().required('Senha atual obrigatória'),
  nova_senha: yup.string().min(8, 'Mínimo 8 caracteres').required('Nova senha obrigatória'),
  confirmar_senha: yup.string().oneOf([yup.ref('nova_senha')], 'As senhas não coincidem').required('Confirmação obrigatória'),
});

export default function AlterarSenhaPage() {
  const { showSuccess, showError } = useNotification();
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setErro('');
    setSucesso('');
    try {
      await perfilAPI.alterarSenha(data);
      setSucesso('Senha alterada com sucesso!');
      showSuccess('Senha alterada com sucesso!');
      reset();
    } catch (e) {
      const errorMessage = e?.response?.data?.error || 'Erro ao alterar senha';
      setErro(errorMessage);
      showError(errorMessage);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Alterar Senha</h1>
      {erro && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{erro}</div>}
      {sucesso && <div className="bg-green-100 text-green-700 p-2 mb-2 rounded">{sucesso}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-4 rounded shadow">
        <div className="mb-2">
          <LabelObrigatorio obrigatorio={true}>Senha Atual</LabelObrigatorio>
          <input type="password" {...register('senha_atual')} className="w-full p-2 rounded bg-slate-700 text-white" />
          {errors.senha_atual && <span className="text-red-400 text-sm">{errors.senha_atual?.message}</span>}
        </div>
        <div className="mb-2">
          <LabelObrigatorio obrigatorio={true}>Nova Senha</LabelObrigatorio>
          <input type="password" {...register('nova_senha')} className="w-full p-2 rounded bg-slate-700 text-white" />
          {errors.nova_senha && <span className="text-red-400 text-sm">{errors.nova_senha?.message}</span>}
        </div>
        <div className="mb-2">
          <LabelObrigatorio obrigatorio={true}>Confirmar Nova Senha</LabelObrigatorio>
          <input type="password" {...register('confirmar_senha')} className="w-full p-2 rounded bg-slate-700 text-white" />
          {errors.confirmar_senha && <span className="text-red-400 text-sm">{errors.confirmar_senha?.message}</span>}
        </div>
        <button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Alterar Senha</button>
      </form>
    </div>
  );
} 