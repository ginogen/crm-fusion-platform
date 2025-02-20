interface FacebookAuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
  graphDomain: string;
  data_access_expiration_time: number;
}

interface FacebookLoginResponse {
  authResponse: FacebookAuthResponse | null;
  status: 'connected' | 'not_authorized' | 'unknown';
}

interface FacebookLoginOptions {
  scope: string;
}

interface FacebookApiResponse<T> {
  data: T;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface Window {
  fbAsyncInit: () => void;
  FB: {
    init(options: {
      appId: string;
      cookie: boolean;
      xfbml: boolean;
      version: string;
    }): void;
    login(
      callback: (response: FacebookLoginResponse) => void,
      options?: FacebookLoginOptions
    ): void;
    api<T>(
      path: string,
      method: string,
      params?: Record<string, any>
    ): Promise<FacebookApiResponse<T>>;
  };
} 