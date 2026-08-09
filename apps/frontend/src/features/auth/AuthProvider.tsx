import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type SupabaseAuthClient = Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'>;

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  identity: User | null;
}

interface AuthProviderProps {
  children: ReactNode;
  client: SupabaseAuthClient;
}

const initialAuthState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  session: null,
  identity: null,
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function resolveAuthState(session: Session | null): AuthState {
  return {
    isLoading: false,
    isAuthenticated: session !== null,
    session,
    identity: session?.user ?? null,
  };
}

export function AuthProvider({ children, client }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isActive = true;
    let receivedAuthEvent = false;
    const initialSession = client.getSession();
    const {
      data: { subscription },
    } = client.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;

      if (isActive) {
        setAuthState(resolveAuthState(session));
      }
    });

    void initialSession
      .then(({ data }) => {
        if (isActive && !receivedAuthEvent) {
          setAuthState(resolveAuthState(data.session));
        }
      })
      .catch(() => {
        if (isActive && !receivedAuthEvent) {
          setAuthState(resolveAuthState(null));
        }
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo(() => authState, [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const authState = useContext(AuthContext);

  if (!authState) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return authState;
}
