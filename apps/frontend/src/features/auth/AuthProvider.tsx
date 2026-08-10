import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SupabaseAuthClient = Pick<
  SupabaseClient['auth'],
  'getSession' | 'onAuthStateChange' | 'signInWithOAuth' | 'signOut'
>;

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  identity: User | null;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  const signInWithGoogle = useCallback(async () => {
    const { error } = await client.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      throw new Error('Google authentication could not be started.');
    }
  }, [client]);

  const signOut = useCallback(async () => {
    const { error } = await client.signOut();

    if (error) {
      throw new Error('Sign-out could not be completed.');
    }
  }, [client]);

  const value = useMemo(
    () => ({ ...authState, signInWithGoogle, signOut }),
    [authState, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const authState = useContext(AuthContext);

  if (!authState) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return authState;
}
