export const dealCards = (lobby, variant) => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);

    const hands = {};
    const num = variant === "3" ? 3 : 9; 
    const numPlayers = lobby.players.length;

    lobby.players.forEach((player, i) => {
        hands[player.id] = shuffled.slice(i * num, (i + 1) * num);
    });

    const remainingDeck = shuffled.slice(num * numPlayers);

    return { hands, remainingDeck };
};


 const shuffleDeck = (deck) => {
    const shuffled = [...deck] 
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

const createDeck = () => {
    const suits = ['c', 'o', 'e', 'p'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '11', '12', '13']
    const cardPoints = { 1: 11, 7: 10, 13: 4, 11: 3, 12: 2 }
    const cardPower = { 1: 5, 7: 4, 13: 3, 11: 2, 12: 1 }
    const suitsNames = {
        'c': 'Hearts',
        'o': 'Diamonds',
        'e': 'Spades',
        'p': 'Clubs'
    };

    const deck = [];
    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({
                image: `/cards/${suit}${rank}.png`,
                title: `${rank} of ${suitsNames[suit]}`,
                suit,
                rank: Number(rank),
                points: cardPoints[rank] || 0,
                power: cardPower[rank] || 0
            })
        })
    });

    return deck;
}
