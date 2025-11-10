import React, { useState, useEffect, useCallback, useReducer, useMemo } from 'react';

const SET_CODE = 'tla';
const STORAGE_KEY = `rankings-${SET_CODE}`;

const initialState = {
  filters: {
    colors: [],
    type: '',
    cmc: '',
    showUnrankedOnly: false,
  },
  sortBy: 'name',
};

function stateReducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER':
      action.onFilterChange();
      const newFilters = { ...state.filters, [action.payload.filterName]: action.payload.value };
      if (action.payload.filterName !== 'showUnrankedOnly') {
        newFilters.showUnrankedOnly = false;
      }
      return {
        ...state,
        filters: newFilters,
      };
    case 'SET_SORT':
      action.onSortChange();
      return { ...state, sortBy: action.payload };
    default:
      return state;
  }
}

const getCardColors = (card) => {
  if (card.card_faces) {
    return [...new Set(card.card_faces.flatMap(face => face.colors || []))];
  }
  return card.colors || [];
};

const GalleryCard = ({ card, rank }) => {
    const imageUrl = card.localImagePaths?.[0]
    ? `/sets/${SET_CODE}/${card.localImagePaths[0]}`
    : card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;

    return (
        <div className="flex flex-col items-center gap-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
            <img src={imageUrl} alt={card.name} loading="lazy" className="w-48 h-auto rounded-md" />
            <div className={`font-bold text-lg px-3 py-1 rounded ${rank ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                {rank || 'N/A'}
            </div>
        </div>
    );
};

const GalleryView = ({ cards, rankings }) => {
    return (
        <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {cards.map(card => (
                <GalleryCard key={card.id} card={card} rank={rankings[card.id]} />
            ))}
        </div>
    );
};

const Card = ({ card, currentRank, onRank, onNext }) => {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedModifier, setSelectedModifier] = useState(null);

  const handleRank = useCallback((grade, modifier) => {
    const finalRank = `${grade}${modifier || ''}`;
    onRank(card.id, finalRank);
    onNext();
  }, [card.id, onRank, onNext]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'F'].includes(key)) {
        setSelectedGrade(key);
        handleRank(key, selectedModifier);
      } else if (key === '+' || key === '=') {
        setSelectedModifier('+');
        if (selectedGrade) handleRank(selectedGrade, '+');
      } else if (key === '-') {
        setSelectedModifier('-');
        if (selectedGrade) handleRank(selectedGrade, '-');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGrade, selectedModifier, handleRank]);

  const imageUrl = card.localImagePaths?.[0]
    ? `/sets/${SET_CODE}/${card.localImagePaths[0]}`
    : card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;

  return (
    <div className="w-full max-w-xs mx-auto border rounded-lg p-4 shadow-lg flex flex-col bg-gray-800 border-gray-700">
      <div className="mb-4">
        {imageUrl ? (
          <img src={imageUrl} alt={card.name} loading="lazy" className="w-64 h-auto rounded-lg mx-auto" />
        ) : (
          <div className="flex items-center justify-center w-full min-h-[300px] bg-gray-700 rounded-lg text-center text-gray-300 p-2">
            {card.name} (No Image)
          </div>
        )}
      </div>

      {currentRank && (
        <div className="text-center mb-2 text-lg font-bold text-yellow-400">
          Current Rank: {currentRank}
        </div>
      )}

      <div className="space-y-3 mt-auto">
        <div className="flex justify-around">
          {['A', 'B', 'C', 'D', 'F'].map(grade => (
            <button
              key={grade}
              onClick={(e) => { e.stopPropagation(); setSelectedGrade(grade); handleRank(grade, selectedModifier); }}
              className={`w-10 h-10 text-md font-bold rounded-full transition-colors shadow-md ${selectedGrade === grade ? 'bg-blue-600 text-white ring-4 ring-blue-400' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {grade}
            </button>
          ))}
        </div>
        <div className="flex justify-center space-x-4 mt-2">
          {['+', '-'].map(mod => (
            <button
              key={mod}
              onClick={(e) => { e.stopPropagation(); setSelectedModifier(mod); if (selectedGrade) handleRank(selectedGrade, mod); }}
              className={`w-9 h-9 text-md font-bold rounded-full transition-colors shadow-md ${selectedModifier === mod ? 'bg-green-600 text-white ring-4 ring-green-400' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const FilterControls = ({ dispatch, onFilterChange, filters }) => {
    const handleColorChange = (color) => {
        dispatch({
            type: 'SET_FILTER',
            payload: { filterName: 'colors', value: color },
            onFilterChange: onFilterChange
        });
    };

    const handleUnrankedFilter = () => {
         dispatch({
            type: 'SET_FILTER',
            payload: { filterName: 'showUnrankedOnly', value: !filters.showUnrankedOnly },
            onFilterChange: onFilterChange
        });
    };

    return (
        <div className="p-4 bg-gray-800 rounded-lg mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
                {['W', 'U', 'B', 'R', 'G'].map(color => (
                    <button key={color} onClick={() => handleColorChange(color)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">{color}</button>
                ))}
                <button onClick={() => handleColorChange('M')} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">Multi</button>
                <button onClick={() => handleColorChange('C')} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">Colorless</button>
                <button onClick={() => handleColorChange([])} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">All</button>
            </div>
            <button
                onClick={handleUnrankedFilter}
                className={`px-3 py-1 rounded transition-colors ${filters.showUnrankedOnly ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
                Unranked
            </button>
            <select onChange={(e) => dispatch({ type: 'SET_FILTER', payload: { filterName: 'type', value: e.target.value }, onFilterChange })} className="bg-gray-700 p-2 rounded">
                <option value="">All Types</option>
                <option value="Creature">Creature</option>
                <option value="Instant">Instant</option>
                <option value="Sorcery">Sorcery</option>
                <option value="Enchantment">Enchantment</option>
                <option value="Artifact">Artifact</option>
                <option value="Land">Land</option>
            </select>
            <input
              type="number"
              placeholder="Max CMC"
              onChange={(e) => dispatch({ type: 'SET_FILTER', payload: { filterName: 'cmc', value: e.target.value }, onFilterChange })}
              className="bg-gray-700 p-2 rounded w-24"
            />
        </div>
    );
};

const SortControls = ({ dispatch, onSortChange }) => (
  <div className="p-4 bg-gray-800 rounded-lg mb-4">
    <label>Sort by: </label>
    <select onChange={(e) => dispatch({ type: 'SET_SORT', payload: e.target.value, onSortChange })} className="bg-gray-700 p-2 rounded ml-2">
      <option value="name">Name</option>
      <option value="rarity">Rarity</option>
      <option value="rank">My Rank</option>
    </select>
  </div>
);

const ShareControls = ({ rankings, allCards }) => {
  const exportRankings = () => {
    const unrankedCount = allCards.filter(card => !rankings[card.id]).length;
    if (unrankedCount > 0) {
      const proceed = window.confirm(
        `You have ${unrankedCount} unranked card(s). Are you sure you want to export?`
      );
      if (!proceed) {
        return;
      }
    }

    const rankingString = btoa(JSON.stringify(rankings));
    navigator.clipboard.writeText(rankingString);
    alert('Rankings copied to clipboard!');
  };

  const importRankings = () => {
    const rankingString = prompt('Paste your ranking string:');
    if (rankingString) {
      try {
        const decoded = atob(rankingString);
        localStorage.setItem(STORAGE_KEY, decoded);
        window.location.reload();
      } catch {
        alert('Invalid ranking string!');
      }
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg mb-4 flex gap-4">
      <button onClick={exportRankings} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">Export</button>
      <button onClick={importRankings} className="bg-green-600 px-4 py-2 rounded hover:bg-green-500">Import</button>
    </div>
  );
};

export default function App() {
  const [allCards, setAllCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('ranker');

  const [rankings, setRankings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load rankings from localStorage", e);
      return {};
    }
  });

  const [state, dispatch] = useReducer(stateReducer, initialState);

  useEffect(() => {
    async function loadCards() {
      setIsLoading(true);
      try {
        const response = await fetch(`/sets/${SET_CODE}/${SET_CODE}.json`);
        if (!response.ok) throw new Error(`Could not find ${SET_CODE}.json`);
        const data = await response.json();
        setAllCards(data);
      } catch (err) {
        console.error(err);
        setError(`Failed to load card data. Make sure ${SET_CODE}.json is in /public/sets/${SET_CODE}/`);
      } finally {
        setIsLoading(false);
      }
    }
    loadCards();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
    } catch (e) {
      console.error("Failed to save rankings to localStorage", e);
    }
  }, [rankings]);

  const filteredAndSortedCards = useMemo(() => {
    let filtered = allCards
      .filter(card => {
        const { colors, type, cmc, showUnrankedOnly } = state.filters;
        const cardColors = getCardColors(card);
        
        if (showUnrankedOnly && rankings[card.id]) {
            return false;
        }

        if (colors.length > 0) {
            if (colors === 'M' && cardColors.length <= 1) return false;
            if (colors === 'C' && cardColors.length > 0) return false;
            if (Array.isArray(colors) && colors.length > 0 && !colors.some(c => cardColors.includes(c))) return false;
        }
        if (type && !card.type_line.includes(type)) return false;
        if (cmc && card.cmc > parseInt(cmc)) return false;
        return true;
      });

    const rarityOrder = { 'common': 4, 'uncommon': 3, 'rare': 2, 'mythic': 1 };
    const gradeOrder = { 'A+': 1, 'A': 2, 'A-': 3, 'B+': 4, 'B': 5, 'B-': 6, 'C+': 7, 'C': 8, 'C-': 9, 'D+': 10, 'D': 11, 'D-': 12, 'F': 13 };

    return filtered.sort((a, b) => {
      if (state.sortBy === 'name') return a.name.localeCompare(b.name);
      if (state.sortBy === 'rarity') return (rarityOrder[a.rarity] || 5) - (rarityOrder[b.rarity] || 5);
      if (state.sortBy === 'rank') {
          const rankA = rankings[a.id] ? (gradeOrder[rankings[a.id]] || 99) : 100;
          const rankB = rankings[b.id] ? (gradeOrder[rankings[b.id]] || 99) : 100;
          return rankA - rankB;
      }
      return 0;
    });
  }, [allCards, state.filters, state.sortBy, rankings]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % filteredAndSortedCards.length);
  }, [filteredAndSortedCards.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + filteredAndSortedCards.length) % filteredAndSortedCards.length);
  }, [filteredAndSortedCards.length]);

  const handleRank = useCallback((cardId, rank) => {
    setRankings(prevRankings => ({
      ...prevRankings,
      [cardId]: rank
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'ranker') return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, viewMode]);

  if (error) return <div className="min-h-screen bg-gray-900 text-white p-6"><h2 className="text-2xl">Error</h2><p>{error}</p></div>;
  if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center"><p>Loading cards...</p></div>;

  const currentCard = filteredAndSortedCards[currentIndex];

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 flex flex-col items-center">
      <h1 className="text-3xl text-center mb-4">MTG Card Ranker: {SET_CODE.toUpperCase()}</h1>
      <div className="sticky top-0 z-10 bg-gray-900 py-2 w-full flex justify-center">
          <div className="container mx-auto flex flex-wrap justify-center items-start gap-4">
              <FilterControls 
                  dispatch={dispatch} 
                  onFilterChange={() => setCurrentIndex(0)} 
                  filters={state.filters}
              />
              <SortControls dispatch={dispatch} onSortChange={() => setCurrentIndex(0)} />
              <ShareControls rankings={rankings} allCards={allCards} />
              
              <div className="p-4 bg-gray-800 rounded-lg mb-4 flex gap-2">
                <button onClick={() => setViewMode('ranker')} className={`px-4 py-2 rounded ${viewMode === 'ranker' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>Ranker</button>
                <button onClick={() => setViewMode('gallery')} className={`px-4 py-2 rounded ${viewMode === 'gallery' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>Gallery</button>
              </div>
          </div>
      </div>

      <main className="flex-grow flex items-center justify-center w-full max-w-7xl mx-auto mt-4">
        {filteredAndSortedCards.length > 0 ? (
          <>
            {viewMode === 'ranker' && (
              <div className="flex items-center justify-center gap-4">
                <button onClick={handlePrev} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-2xl">←</button>
                <Card
                  card={currentCard}
                  currentRank={rankings[currentCard.id]}
                  onRank={handleRank}
                  onNext={handleNext}
                />
                <button onClick={handleNext} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-2xl">→</button>
              </div>
            )}
            {viewMode === 'gallery' && (
              <GalleryView cards={filteredAndSortedCards} rankings={rankings} />
            )}
          </>
        ) : (
          <p className="text-center">No cards match the current filters.</p>
        )}
      </main>
      
      <footer className="text-center mt-4">
        <p>Showing {filteredAndSortedCards.length} cards</p>
        {viewMode === 'ranker' && filteredAndSortedCards.length > 0 && (
          <p>Card {currentIndex + 1} of {filteredAndSortedCards.length}</p>
        )}
      </footer>
    </div>
  );
}