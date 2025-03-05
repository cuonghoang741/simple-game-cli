// Environment configuration
const env = {
  development: {
    BACKEND_WS_URL: 'ws://103.179.189.84:2000',
  },
  production: {
    BACKEND_WS_URL: 'ws://103.179.189.84:2000',
  }
};

// Get current environment
const currentEnv = import.meta.env.MODE || 'development';

// Export config for current environment
export const config = env[currentEnv as keyof typeof env]; 