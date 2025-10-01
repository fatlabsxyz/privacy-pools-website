import { DependencyList, useEffect, useState } from 'react';

export const useAsyncMemo = <T, K>(callback: () => Promise<T>, initialValue: K, deps: DependencyList): T | K => {
  const [val, setVal] = useState<T | K>(initialValue);

  useEffect(() => {
    let cancelled = false;

    callback().then((result) => {
      if (!cancelled) setVal(result);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...deps]);

  return val;
};
