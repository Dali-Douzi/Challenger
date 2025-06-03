import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch games and their formats
 * Returns all available formats from all games
 */
const useGameFormats = () => {
  const [games, setGames] = useState([]);
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/games');
        const gamesData = response.data;
        
        setGames(gamesData);
        
        // Extract all unique formats from all games
        const allFormats = gamesData.reduce((acc, game) => {
          if (game.formats && Array.isArray(game.formats)) {
            game.formats.forEach(format => {
              if (!acc.includes(format)) {
                acc.push(format);
              }
            });
          }
          return acc;
        }, []);
        
        // Sort formats for better UX
        const sortedFormats = allFormats.sort((a, b) => {
          // Custom sorting: put "Best of X" formats first, then others
          const aIsBest = a.toLowerCase().startsWith('best of');
          const bIsBest = b.toLowerCase().startsWith('best of');
          
          if (aIsBest && !bIsBest) return -1;
          if (!aIsBest && bIsBest) return 1;
          
          // If both are "Best of" or neither, sort alphabetically
          return a.localeCompare(b);
        });
        
        setFormats(sortedFormats);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError(err.response?.data?.message || 'Failed to fetch game formats');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Helper function to get formats for a specific game
  const getFormatsForGame = (gameName) => {
    const game = games.find(g => g.name.toLowerCase() === gameName.toLowerCase());
    return game?.formats || [];
  };

  // Helper function to check if a format is valid for a specific game
  const isFormatValidForGame = (format, gameName) => {
    const gameFormats = getFormatsForGame(gameName);
    return gameFormats.includes(format);
  };

  return {
    games,
    formats,
    loading,
    error,
    getFormatsForGame,
    isFormatValidForGame,
    refetch: () => {
      setLoading(true);
      // Trigger useEffect again by changing a dependency
    }
  };
};

export default useGameFormats;