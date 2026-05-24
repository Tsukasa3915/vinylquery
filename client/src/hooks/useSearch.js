import { useState, useMemo, useEffect } from 'react';

const API_BASE_URL = '/api/search';

export const useSearch = () => {
  // sessionStorageから初期値を取得
  const getInitialState = (key, defaultValue) => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading from sessionStorage', e);
    }
    return defaultValue;
  };

  const [query, setQuery] = useState(() => getInitialState('vq_query', ''));
  const [mode, setMode] = useState(() => getInitialState('vq_mode', 'artist')); // 'artist' or 'freeword'
  const [results, setResults] = useState(() => getInitialState('vq_results', []));
  const [artistInfo, setArtistInfo] = useState(() => getInitialState('vq_artistInfo', null));
  const [artistCandidates, setArtistCandidates] = useState(() => getInitialState('vq_artistCandidates', []));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState(() => getInitialState('vq_sortOption', 'recommended'));

  // 状態が変わるたびにsessionStorageに保存
  useEffect(() => {
    sessionStorage.setItem('vq_query', JSON.stringify(query));
  }, [query]);

  useEffect(() => {
    sessionStorage.setItem('vq_mode', JSON.stringify(mode));
  }, [mode]);

  useEffect(() => {
    sessionStorage.setItem('vq_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    sessionStorage.setItem('vq_artistInfo', JSON.stringify(artistInfo));
  }, [artistInfo]);

  useEffect(() => {
    sessionStorage.setItem('vq_artistCandidates', JSON.stringify(artistCandidates));
  }, [artistCandidates]);

  useEffect(() => {
    sessionStorage.setItem('vq_sortOption', JSON.stringify(sortOption));
  }, [sortOption]);

  const handleSearch = async (searchQuery, searchMode) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setArtistInfo(null);
    setResults([]);
    setArtistCandidates([]);
    
    try {
      const endpoint = searchMode === 'artist' ? '/artist' : '/freeword';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '検索中にエラーが発生しました');
      }

      const data = await response.json();
      
      if (searchMode === 'artist' && data.isSelectionRequired) {
        // アーティスト選択が必要な場合、候補をセットする
        setArtistCandidates(data.artists || []);
        setResults([]);
      } else {
        // フリーワード検索などの場合は直接結果をセット
        setResults(data.results || []);
        setArtistCandidates([]);
      }
      
      // Reset sort to recommended when new search happens
      setSortOption('recommended');
      
    } catch (err) {
      setError(err.message);
      setResults([]);
      setArtistCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // アーティスト候補から特定のアーティストを選択した時の処理
  const selectArtist = async (artistId, artistName, artistThumb) => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/artist/releases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistId, artistName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'リリース一覧の取得に失敗しました');
      }

      const data = await response.json();
      
      setResults(data.results || []);
      setArtistInfo(data.artist || { id: artistId, name: artistName, thumb: artistThumb });
      setArtistCandidates([]); // 選択完了したので候補をクリア
      
      setSortOption('recommended');
      
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Zero-second sort implementation
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const sorted = [...results];
    
    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => {
          if (!a.year) return 1;
          if (!b.year) return -1;
          return b.year - a.year;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          if (!a.year) return 1;
          if (!b.year) return -1;
          return a.year - b.year;
        });
      case 'recommended':
      default:
        // Already sorted by relevance_score from backend
        return sorted;
    }
  }, [results, sortOption]);

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setArtistInfo(null);
    setArtistCandidates([]);
    setError(null);
  };

  return {
    query,
    setQuery,
    mode,
    setMode,
    results: sortedResults,
    originalResultsCount: results.length,
    artistInfo,
    artistCandidates,
    isLoading,
    error,
    sortOption,
    setSortOption,
    handleSearch,
    selectArtist,
    resetSearch
  };
};
