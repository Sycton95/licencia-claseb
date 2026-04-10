import { useEffect, useState } from 'react';
import { getPublishedCatalog } from '../lib/contentRepository';
import type { ContentCatalog } from '../types/content';

type PublishedCatalogState = {
  catalog: ContentCatalog | null;
  error: string | null;
  isLoading: boolean;
};

const INITIAL_STATE: PublishedCatalogState = {
  catalog: null,
  error: null,
  isLoading: true,
};

export function usePublishedCatalog(errorMessage: string) {
  const [state, setState] = useState<PublishedCatalogState>(INITIAL_STATE);

  useEffect(() => {
    let isMounted = true;

    setState(INITIAL_STATE);

    getPublishedCatalog()
      .then((catalog) => {
        if (!isMounted) {
          return;
        }

        setState({
          catalog,
          error: null,
          isLoading: false,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setState({
          catalog: null,
          error: errorMessage,
          isLoading: false,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [errorMessage]);

  return state;
}
