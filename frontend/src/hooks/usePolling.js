import { useState, useEffect, useRef, useCallback } from 'react';

export function usePolling(fetchFn, intervalMs, stopCondition) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  
  // Need to stabilize fetchFn and stopCondition via useCallback ideally, 
  // but to be safe, ref them if they are re-created on each render.
  
  const fnRef = useRef(fetchFn);
  const stopRef = useRef(stopCondition);
  
  useEffect(() => {
    fnRef.current = fetchFn;
    stopRef.current = stopCondition;
  }, [fetchFn, stopCondition]);

  useEffect(() => {
    let isMounted = true;
    
    const poll = async () => {
      try {
        const result = await fnRef.current();
        if (isMounted) {
          setData(result);
          setError(null);
          setLoading(false);
          
          if (stopRef.current(result)) {
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    };

    poll(); // Initial call
    timerRef.current = setInterval(poll, intervalMs);

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return { data, loading, error };
}
