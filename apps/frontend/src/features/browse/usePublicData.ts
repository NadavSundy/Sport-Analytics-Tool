import { useCallback, useEffect, useRef, useState } from 'react';

type PublicDataState<Data> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: Data; error: null }
  | { status: 'error'; data: null; error: Error };

interface PendingPublicRequest<Data> {
  controller: AbortController;
  load: (signal: AbortSignal) => Promise<Data>;
  promise: Promise<Data>;
  reloadCount: number;
  requestKey: string;
  subscribers: number;
}

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
  const pendingRequest = useRef<PendingPublicRequest<Data> | null>(null);

  useEffect(() => {
    let request = pendingRequest.current;
    const canReuseRequest =
      request &&
      request.load === load &&
      request.requestKey === requestKey &&
      request.reloadCount === reloadCount &&
      !request.controller.signal.aborted;

    if (!canReuseRequest) {
      const controller = new AbortController();
      request = {
        controller,
        load,
        promise: load(controller.signal),
        reloadCount,
        requestKey,
        subscribers: 0,
      };
      pendingRequest.current = request;
    }

    if (!request) {
      throw new Error('Expected a pending public-data request.');
    }

    const activeRequest = request;
    activeRequest.subscribers += 1;
    let mounted = true;
    setState({ status: 'loading', data: null, error: null });

    void activeRequest.promise
      .then((data) => {
        if (mounted && !activeRequest.controller.signal.aborted) {
          setState({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (mounted && !activeRequest.controller.signal.aborted) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error('The public API request failed.'),
          });
        }
      });

    return () => {
      mounted = false;
      activeRequest.subscribers -= 1;

      queueMicrotask(() => {
        if (activeRequest.subscribers === 0) {
          activeRequest.controller.abort();
          if (pendingRequest.current === activeRequest) {
            pendingRequest.current = null;
          }
        }
      });
    };
  }, [load, reloadCount, requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
}
