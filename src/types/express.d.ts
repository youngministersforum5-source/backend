export interface AuthenticatedAdmin {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export {};
