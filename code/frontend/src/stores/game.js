import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const cards = []
  const suits = ['c', 'o', 'e', 'p']
  const ranks = ['1','2','3','4','5','6','7','11','12','13']

  const cardPoints = { 1: 11, 7: 10, 13: 4, 11: 3, 12: 2 }

  suits.forEach(suit => {
    ranks.forEach(rank => {
      cards.push({
        image: `/cards/${suit}${rank}.png`,
        title: `${rank} de ${suit === 'c' ? 'Copas' : suit === 'o' ? 'Ouros' : suit === 'e' ? 'Espadas' : 'Paus'}`,
        suit,
        rank: Number(rank),
        points: cardPoints[rank] || 0
      })
    })
  })

  const faceDownCard = { image: '/cards/semFace.png', title: 'Carta virada para baixo' }

  const player1 = ref([]) 
  const player2 = ref([]) 
  const remainingDeck = ref([])
  const board = ref([]) 
  const dealer = ref(null)
  const currentTurn = ref(1)
  const player1Points = ref(0)
  const player2Points = ref(0)
  const player1Won = ref([])
  const player2Won = ref([])
  const lastTrickWinner = ref(null)
  const winner = ref(null)
  const trump = ref(null)
  const player1Marks = ref(0)
  const player2Marks = ref(0)
  const matchWinner = ref(null)
  const waitingForDraw = ref(false)

  const deal = (num = 9) => {
    const shuffled = [...cards].sort(() => 0.5 - Math.random())
    player1.value = shuffled.slice(0, num)
    player2.value = shuffled.slice(num, num * 2)
    remainingDeck.value = shuffled.slice(num * 2)
    board.value = []
    player1Won.value = []
    player2Won.value = []
    lastTrickWinner.value = null
    player1Points.value = 0
    player2Points.value = 0
    winner.value = null
    waitingForDraw.value = false
    trump.value = remainingDeck.value[remainingDeck.value.length - 1]
    
    if (dealer.value === null) {
      dealer.value = Math.random() < 0.5 ? 1 : 2
    } else {
      dealer.value = dealer.value === 1 ? 2 : 1 
    }
    
    currentTurn.value = dealer.value === 1 ? 2 : 1 
    
    if (currentTurn.value === 2) {
      setTimeout(() => botPlay(), 800)
    }
  }

  const playCard = (player, index) => {
    if (currentTurn.value !== player) return { success: false, message: "Not your turn" }
    if (winner.value) return { success: false, message: "Game is over" }
    if (waitingForDraw.value) return { success: false, message: "Click the deck to draw cards first" }

    let card
    const playerHand = player === 1 ? player1.value : player2.value
    card = playerHand[index]

    if (remainingDeck.value.length === 0 && board.value.length === 1) {
      const leadCard = board.value[0]
      const hasSameSuit = playerHand.some(c => c.suit === leadCard.suit)
      
      if (hasSameSuit && card.suit !== leadCard.suit) {
        return { success: false, message: "You must follow suit!" }
      }
    }

    if (player === 1) {
      card = player1.value.splice(index, 1)[0]
      currentTurn.value = 2
    } else {
      card = player2.value.splice(index, 1)[0]
      currentTurn.value = 1
    }

    if (card) board.value.push({...card, playedBy: player})

    if (board.value.length === 2) {
      setTimeout(() => {
        evaluateTrick()
        checkGameWinner()
      }, 1000)
    } else if (player === 1 && currentTurn.value === 2) {
      setTimeout(() => botPlay(), 800)
    }

    return { success: true }
  }

  const botPlay = () => {
    if (currentTurn.value !== 2 || winner.value || waitingForDraw.value) return
    
    const botHand = player2.value
    let cardIndex = 0

    if (board.value.length === 1) {
      cardIndex = botPlaySecond(botHand, board.value[0])
    } else {
      cardIndex = botPlayFirst(botHand)
    }

    playCard(2, cardIndex)
  }

  const botPlayFirst = (hand) => {
    let lowestIndex = 0
    let lowestValue = hand[0].points

    hand.forEach((card, index) => {
      if (card.points < lowestValue) {
        lowestValue = card.points
        lowestIndex = index
      }
    })

    return lowestIndex
  }

  const botPlaySecond = (hand, leadCard) => {
    const trumpSuit = trump.value?.suit

    if (remainingDeck.value.length === 0) {
      const sameSuitCards = hand.map((c, i) => ({ card: c, index: i })).filter(x => x.card.suit === leadCard.suit)
      
      if (sameSuitCards.length > 0) {
        const winningCards = sameSuitCards.filter(x => x.card.rank > leadCard.rank)
        if (winningCards.length > 0) {
          return winningCards.reduce((min, curr) => curr.card.points < min.card.points ? curr : min).index
        } else {
          return sameSuitCards.reduce((min, curr) => curr.card.points < min.card.points ? curr : min).index
        }
      }
    }

    let winningCards = []

    if (leadCard.suit === trumpSuit) {
      winningCards = hand.map((c, i) => ({ card: c, index: i }))
        .filter(x => x.card.suit === trumpSuit && x.card.rank > leadCard.rank)
    } else {
      const higherSameSuit = hand.map((c, i) => ({ card: c, index: i }))
        .filter(x => x.card.suit === leadCard.suit && x.card.rank > leadCard.rank)
      
      const trumpCards = hand.map((c, i) => ({ card: c, index: i }))
        .filter(x => x.card.suit === trumpSuit)
      
      winningCards = [...higherSameSuit, ...trumpCards]
    }

    if (winningCards.length > 0) {
      return winningCards.reduce((min, curr) => curr.card.points < min.card.points ? curr : min).index
    } else {
      return botPlayFirst(hand)
    }
  }

  const evaluateTrick = () => {
    const [c1, c2] = board.value
    let winnerPlayer

    if (c1.suit === c2.suit) {
      winnerPlayer = c1.rank > c2.rank ? c1.playedBy : c2.playedBy
    } else if (c2.suit === trump.value.suit) {
      winnerPlayer = c2.playedBy
    } else if (c1.suit === trump.value.suit) {
      winnerPlayer = c1.playedBy
    } else {
      winnerPlayer = c1.playedBy
    }

    lastTrickWinner.value = winnerPlayer
    const trickPoints = c1.points + c2.points

    if (winnerPlayer === 1) {
      player1Points.value += trickPoints
      player1Won.value.push(c1, c2)
    } else {
      player2Points.value += trickPoints
      player2Won.value.push(c1, c2)
    }

    console.log(`Player ${winnerPlayer} wins the trick and earns ${trickPoints} points.`)

    if (remainingDeck.value.length > 0) {
      waitingForDraw.value = true
      currentTurn.value = winnerPlayer
     
      if (winnerPlayer === 2) {
        setTimeout(() => drawCards(2), 800)
      }
    } else {
      currentTurn.value = winnerPlayer 
      
      if (winnerPlayer === 2) {
        setTimeout(() => botPlay(), 800)
      }
    }
    
    board.value = []
  }

  const drawCards = (player) => {
    if (!waitingForDraw.value) {
      return { success: false, message: "No cards to draw" }
    }

    if (player !== lastTrickWinner.value) {
      return { success: false, message: "Only the trick winner can draw first!" }
    }

    if (lastTrickWinner.value === 1) {
      player1.value.push(remainingDeck.value.shift())
      if (remainingDeck.value.length > 0) {
        player2.value.push(remainingDeck.value.shift())
      }
    } else {
      player2.value.push(remainingDeck.value.shift())
      if (remainingDeck.value.length > 0) {
        player1.value.push(remainingDeck.value.shift())
      }
    }
    
    if (remainingDeck.value.length === 0) {
      trump.value = null 
    }

    waitingForDraw.value = false
    currentTurn.value = lastTrickWinner.value 

    if (lastTrickWinner.value === 2) {
      setTimeout(() => botPlay(), 800)
    }

    return { success: true }
  }

  const checkGameWinner = () => {
    if (player1.value.length === 0 && player2.value.length === 0 && remainingDeck.value.length === 0) {
      if (player1Points.value >= 61) {
        winner.value = 1
        calculateMarks()
      } else if (player2Points.value >= 61) {
        winner.value = 2
        calculateMarks()
      } else if (player1Points.value === player2Points.value) {
        winner.value = 'draw'
        console.log('Game is a draw - no marks awarded')
      }
    }
  }

  const calculateMarks = () => {
    if (player1Points.value >= 120) {
      player1Marks.value = 4 
      matchWinner.value = 1
      console.log('Player 1 wins with Bandeira (120 points)! Match over.')
    } else if (player1Points.value >= 91) {
      player1Marks.value += 2 
      console.log('Player 1 scores 2 marks (Capote)')
    } else if (player1Points.value >= 61) {
      player1Marks.value += 1 
      console.log('Player 1 scores 1 mark (Risca)')
    } else if (player2Points.value >= 120) {
      player2Marks.value = 4
      matchWinner.value = 2
      console.log('Player 2 wins with Bandeira (120 points)! Match over.')
    } else if (player2Points.value >= 91) {
      player2Marks.value += 2
      console.log('Player 2 scores 2 marks (Capote)')
    } else if (player2Points.value >= 61) {
      player2Marks.value += 1
      console.log('Player 2 scores 1 mark (Risca)')
    }
    
    if (player1Marks.value >= 4 && !matchWinner.value) matchWinner.value = 1
    if (player2Marks.value >= 4 && !matchWinner.value) matchWinner.value = 2
  }

  const resetMatch = () => {
    player1Marks.value = 0
    player2Marks.value = 0
    matchWinner.value = null
    dealer.value = null
  }

  return {
    cards,
    faceDownCard,
    player1,
    player2,
    remainingDeck,
    board,
    dealer,
    currentTurn,
    player1Points,
    player2Points,
    player1Won,
    player2Won,
    lastTrickWinner,
    winner,
    trump,
    player1Marks,
    player2Marks,
    matchWinner,
    waitingForDraw,
    deal,
    playCard,
    drawCards,
    evaluateTrick,
    checkGameWinner,
    calculateMarks,
    resetMatch,
  }
})