import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      businessName: string;
      onboarded: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    businessName?: string;
    onboarded?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    businessName?: string;
    onboarded?: boolean;
  }
}
