import { X } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onSave, 
  saveText = "Salvar",
  isLoading = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2a2b30] border border-slate-800 rounded-lg w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-cyan-600">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={onSave} 
              disabled={isLoading}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              {isLoading ? 'Salvando...' : saveText}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-700 text-white hover:bg-slate-700"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
} 