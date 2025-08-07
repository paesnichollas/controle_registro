import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function AtividadesRecentes({ atividades }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Função para obter cor do badge baseado no status
  const getStatusBadgeVariant = (status) => {
    switch (status?.toUpperCase()) {
      case 'ABERTA':
        return 'secondary';
      case 'EM_ANDAMENTO':
        return 'default';
      case 'CONCLUIDA':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Função para obter cor do badge baseado no status
  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'ABERTA':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'EM_ANDAMENTO':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'CONCLUIDA':
        return 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-100">Atividades Recentes</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white text-xs">
              {atividades.length} itens
            </Badge>
            {atividades.length > 0 && (
              <Button
                onClick={toggleExpanded}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white text-xs"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-gray-400">
          Últimas ordens de serviço criadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Nenhuma atividade recente</p>
          </div>
        ) : (
          <>
            {/* Resumo quando não expandido */}
            {!isExpanded && (
              <div className="space-y-2">
                {atividades.slice(0, 3).map((atividade, index) => (
                  <div 
                    key={atividade.id || index}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors duration-200"
                  >
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium text-sm">
                        OS #{atividade.numero_os} - {atividade.cliente}
                      </p>
                      <p className="text-gray-400 text-xs">{atividade.tempo_decorrido}</p>
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(atividade.status)}
                      className={`${getStatusBadgeStyle(atividade.status)} text-xs`}
                    >
                      {atividade.status}
                    </Badge>
                  </div>
                ))}
                {atividades.length > 3 && (
                  <div className="text-center py-2">
                    <p className="text-gray-400 text-xs">
                      +{atividades.length - 3} atividades adicionais
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Lista completa quando expandido */}
            {isExpanded && (
              <div className="space-y-3">
                {atividades.map((atividade, index) => (
                  <div 
                    key={atividade.id || index}
                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors duration-200"
                  >
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">
                        OS #{atividade.numero_os} - {atividade.cliente}
                      </p>
                      <p className="text-gray-400 text-sm">{atividade.tempo_decorrido}</p>
                      {atividade.descricao && (
                        <p className="text-gray-500 text-xs mt-1 truncate">
                          {atividade.descricao}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(atividade.status)}
                      className={getStatusBadgeStyle(atividade.status)}
                    >
                      {atividade.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 