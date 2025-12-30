import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const cards = []
  const suits = ['c', 'o', 'e', 'p']
  const ranks = ['1','2','3','4','5','6','7','11','12','13']

  const cardPoints = { 1: 11, 7: 10, 13: 4, 11: 3, 12: 2 }

  const cardPower = { 1: 5, 7: 4, 13: 3, 11: 2, 12: 1 }


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

  // bot go brr
  const getPower = (card) => {
    if (!card) return 0
    return cardPower[card.rank] ?? 0
  }

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
    
    // para o trunfo nao desaparecer so pq sim
    trump.value = remainingDeck.value.length > 0 ? remainingDeck.value[remainingDeck.value.length - 1] : null
    
    if (dealer.value === null) {
      dealer.value = Math.random() < 0.5 ? 1 : 2
    } else {
      dealer.value = dealer.value === 1 ? 2 : 1 
    }
    
    currentTurn.value = dealer.value === 1 ? 2 : 1 
    
    if (currentTurn.value === 2) {
      setTimeout(() => botPlay(), 500)
    }
  }

  // nao estava implementado esta regra
  
  const hasSuit = (hand, suit) => hand.some(c => c.suit === suit)

  const isLegalPlay = (player, hand, cardIndex) => {
    const leadCard = board.value[0]
    const chosen = hand[cardIndex]
    
    if (!leadCard) return true

    if (remainingDeck.value.length === 0) {
      const mustFollow = hasSuit(hand, leadCard.suit)
      if (mustFollow && chosen.suit !== leadCard.suit) {
        return false
      }
    }
     return true
  }

  const playCard = (player, index) => {
    const playerHand = player === 1 ? player1.value : player2.value

    if (currentTurn.value !== player) return { success: false, message: "Not your turn" }
    if (winner.value) return { success: false, message: "Game is over" }
    if (waitingForDraw.value) return { success: false, message: "Click the deck to draw cards first" }
    if (index < 0 || index >= playerHand.length) return { success: false, message: "Invalid card index" }

    // valida a jogada com regras que pus
    if (!isLegalPlay(player, playerHand, index)) {
      return { success: false, message: "You must follow suit!" }
    }

    // tira a carta da mao
    const card = playerHand.splice(index, 1)[0]

    if (card) {
      board.value.push({ ...card, playedBy: player })
    }

    currentTurn.value = player === 1 ? 2 : 1

    if (board.value.length === 2) {
      setTimeout(() => {
        evaluateTrick()
        checkGameWinner()
      }, 800)
    } else {
      if (currentTurn.value === 2) {
        setTimeout(() => botPlay(), 300)
      }
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

    if (cardIndex < 0 || cardIndex >= botHand.length) cardIndex = 0

    playCard(2, cardIndex)
  }

  const botPlayFirst = (hand) => {

    //bot vai jogar a carta menos op deproposito
    let bestIndex = 0
    let bestPlay = [getPower(hand[0]), hand[0].points, hand[0].suit === trump.value?.suit ? 1 : 0]

     for (let i = 1; i < hand.length; i++) {
      const h = hand[i]
      const play = [getPower(h), h.points, h.suit === trump.value?.suit ? 1 : 0]
      if (
        play[0] < bestPlay[0] ||
        (play[0] === bestPlay[0] && play[1] < bestPlay[1]) ||
        (play[0] === bestPlay[0] && play[1] === bestPlay[1] && play[2] < bestPlay[2])
      ) {
        bestIndex = i
        bestPlay = play
      }
    }
    return bestIndex
  }


  const botPlaySecond = (hand, leadCard) => {
    const trumpSuit = trump.value?.suit
    // bro tem de assistir se ja for obrigatorio
    const mustFollow = remainingDeck.value.length === 0 && hasSuit(hand, leadCard.suit)
    const indexed = hand.map((c, i) => ({ card: c, index: i }))

    if (mustFollow) {
      const sameSuit = indexed.filter(x => x.card.suit === leadCard.suit)
      // se tiver cartas do mesmo naipe tenta ganhar com a menos op que ganha
      const winning = sameSuit.filter(x => getPower(x.card) > getPower(leadCard))
      if (winning.length > 0) {
        return winning.reduce((best, cur) => (getPower(cur.card) < getPower(best.card) ? cur : best)).index
      }
      // se nao tiver carta que ganha joga a menos op de todas as do mesmo naipe
      if (sameSuit.length > 0) {
        return sameSuit.reduce((best, cur) => (getPower(cur.card) < getPower(best.card) ? cur : best)).index
      }
    } else {
      // se nao precisar de assisstir
      const higherSameSuit = indexed.filter(x => x.card.suit === leadCard.suit && getPower(x.card) > getPower(leadCard))

      // tenta ganhar com o trunfo se o trunfo nao for a primeira jogada
      if (leadCard.suit !== trumpSuit && leadCard.points === 0) {
        if (higherSameSuit.length > 0) {
          return higherSameSuit.reduce((best, cur) => (getPower(cur.card) < getPower(best.card) ? cur : best)).index
        }
        const nonTrump = indexed.filter(x => x.card.suit !== trumpSuit)
        if (nonTrump.length > 0) {
          return nonTrump.reduce((best, cur) => getPower(cur.card) > getPower(best.card) ? cur : best).index
        }

      } else if (leadCard.suit !== trumpSuit && leadCard.points > 0) {
        // se a carta valer pontos 
        // tenta ganhar com uma do mesmo naipe mais op
        if (higherSameSuit.length > 0) {
          return higherSameSuit.reduce((best, cur) => (getPower(cur.card) < getPower(best.card) ? cur : best)).index
        }
        // se nao tiver tenta com um trunfo
        const trumps = indexed.filter(x => x.card.suit === trumpSuit)
        if (trumps.length > 0) {
          return trumps.reduce((best, cur) => (getPower(cur.card) < getPower(best.card) ? cur : best)).index
        }

      } else if (leadCard.suit === trumpSuit) {
        // se a carta jogada for trunfo jogar um trunfo mais op
        const higherTrumps = indexed.filter(x => x.card.suit === trumpSuit && getPower(x.card) > getPower(leadCard))

        if (higherTrumps.length > 0) {
          return higherTrumps.reduce((best, cur) => (getPower(cur.card) < getPower(best.card) ? cur : best)).index
        }
      }
    }

    //jogar a carta menos op se for a unica opção restante
    return botPlayFirst(hand)
  }

  const evaluateTrick = () => {
    const [c1, c2] = board.value
    if (!c1 || !c2) return

    const trumpSuit = trump.value?.suit
    let winnerPlayer

    if (c1.suit === c2.suit) {
      winnerPlayer = getPower(c1) > getPower(c2) ? c1.playedBy : c2.playedBy
    } else if (c1.suit === trumpSuit && c2.suit !== trumpSuit) {
      winnerPlayer = c1.playedBy
    } else if (c2.suit === trumpSuit && c1.suit !== trumpSuit) {
      winnerPlayer = c2.playedBy
    } else {
      winnerPlayer = c1.playedBy
    }

    lastTrickWinner.value = winnerPlayer
    const trickPoints = (c1.points || 0) + (c2.points || 0)

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
        setTimeout(() => drawCards(2), 500)
      }
    } else {
      currentTurn.value = winnerPlayer 
      
      if (winnerPlayer === 2) {
        setTimeout(() => botPlay(), 500)
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

    waitingForDraw.value = false
    currentTurn.value = lastTrickWinner.value 

    if (lastTrickWinner.value === 2) {
      setTimeout(() => botPlay(), 800)
    }

    return { success: true }
  }

  const checkGameWinner = () => {
    if (
      player1.value.length === 0 &&
      player2.value.length === 0 &&
      remainingDeck.value.length === 0
    ) {
      if (player1Points.value >= 61 && player1Points.value > player2Points.value) {
        winner.value = 1
        calculateMarks()
      } else if (player2Points.value >= 61 && player2Points.value > player1Points.value) {
        winner.value = 2
        calculateMarks()
      } else if (player1Points.value === player2Points.value) {
        winner.value = 'draw'
        console.log('Game is a draw - no marks awarded')
      }
    }
  }

  const calculateMarks = () => {
    player1Marks.value = 0
    player2Marks.value = 0
    matchWinner.value = null

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