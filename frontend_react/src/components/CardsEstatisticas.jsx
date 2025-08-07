import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function CardsEstatisticas({ dados }) {
  const cards = [
    {
      titulo: 'Total de OS',
      valor: dados.total_os,
      descricao: 'Ordens de serviço cadastradas',
      icone: FileText,
      cor: 'blue'
    },
    {
      titulo: 'OS Abertas',
      valor: dados.os_abertas,
      descricao: 'Ordens de serviço abertas',
      icone: AlertCircle,
      cor: 'yellow'
    },
    {
      titulo: 'Em Andamento',
      valor: dados.os_em_andamento,
      descricao: 'Sendo executadas',
      icone: Clock,
      cor: 'cyan'
    },
    {
      titulo: 'Concluídas',
      valor: dados.os_concluidas,
      descricao: 'Finalizadas',
      icone: CheckCircle,
      cor: 'emerald'
    },
    {
      titulo: 'Canceladas',
      valor: dados.os_canceladas,
      descricao: 'Ordens canceladas',
      icone: XCircle,
      cor: 'red'
    }
  ];

  const getCorClasses = (cor) => {
    const classes = {
      blue: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        valor: 'text-blue-400'
      },
      yellow: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        valor: 'text-yellow-400'
      },
      cyan: {
        bg: 'bg-cyan-500/20',
        text: 'text-cyan-400',
        valor: 'text-cyan-400'
      },
      emerald: {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        valor: 'text-emerald-400'
      },
      red: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        valor: 'text-red-400'
      }
    };
    return classes[cor] || classes.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {cards.map((card, index) => {
        const Icone = card.icone;
        const cores = getCorClasses(card.cor);
        
        return (
          <Card key={index} className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 ${cores.bg} rounded-lg`}>
                  <Icone className={`w-6 h-6 ${cores.text}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{card.titulo}</p>
                  <p className={`text-2xl font-bold ${cores.valor}`}>{card.valor}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{card.descricao}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 