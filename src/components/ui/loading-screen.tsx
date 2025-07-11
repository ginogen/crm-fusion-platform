import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

export const LoadingScreen = ({ 
  message = "Cargando...", 
  showLogo = true 
}: LoadingScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {showLogo && (
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">CF</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg text-gray-700">{message}</span>
        </div>
        <p className="text-sm text-gray-500 max-w-md">
          Iniciando CRM Fusion Platform...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen; 