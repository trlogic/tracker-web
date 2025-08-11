declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_KEY: string;
      REACT_APP_API_URL: string;
      REACT_APP_TENANT: string;
    }
  }
}

export {};
