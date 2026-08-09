import { useCallback, useEffect, useState } from 'react';

type PublicDataState<Data> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: Data; error: null }
  | { status: 'error'; data: null; error: Error };

export function usePublicData<Data>(
  load: (signal: AbortSignal) => Promise<Data>,
  requestKey: string,
) {
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<PublicDataState<Data>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });

    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error('The public API request failed.'),
          });
        }
      });

    return () => controller.abort();
  }, [load, reloadCount, requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
}
