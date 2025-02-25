import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function FacebookCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Obtener el código de la URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          throw new Error('No se recibió el código de autorización');
        }

        // 2. Intercambiar el código por un token de acceso
        const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
        const FB_APP_SECRET = import.meta.env.VITE_FACEBOOK_APP_SECRET;
        const redirectUri = `${window.location.origin}/auth/facebook/callback`;

        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `client_id=${FB_APP_ID}&` +
          `client_secret=${FB_APP_SECRET}&` +
          `redirect_uri=${redirectUri}&` +
          `code=${code}`
        );

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(tokenData.error.message);
        }

        // 3. Obtener token de larga duración (60 días)
        const longLivedTokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&` +
          `client_id=${FB_APP_ID}&` +
          `client_secret=${FB_APP_SECRET}&` +
          `fb_exchange_token=${tokenData.access_token}`
        );

        const longLivedTokenData = await longLivedTokenResponse.json();
        
        if (longLivedTokenData.error) {
          throw new Error(longLivedTokenData.error.message);
        }

        // 4. Guardar el token de larga duración
        localStorage.setItem('fb_access_token', longLivedTokenData.access_token);
        
        // 5. Verificar el token obteniendo información básica
        const verifyResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${longLivedTokenData.access_token}`
        );

        const userData = await verifyResponse.json();
        
        if (userData.error) {
          throw new Error(userData.error.message);
        }

        toast.success('Conectado correctamente con Facebook');
        navigate('/campanas');

      } catch (error) {
        console.error('Error en la autenticación de Facebook:', error);
        toast.error('Error al conectar con Facebook');
        navigate('/campanas');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-lg">Conectando con Facebook...</p>
      </div>
    </div>
  );
} 