import { Server } from "socket.io"
import { dealCards } from "./game.js"

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const lobbies = {};
const RECONNECT_TIMEOUT = 60000; 

function getAvailableLobbies() {
    const result = Object.entries(lobbies).map(([id, lobby]) => ({
        id,
        playerCount: lobby.players.length,
        maxPlayers: 2,
        isFull: lobby.players.length >= 2,
        type: lobby.type,
        variant: lobby.variant,
        creatorId: lobby.creatorId,
        creatorNickname: lobby.creatorNickname,
        gameStarted: lobby.gameStarted || false,
        players: lobby.players.map(p => ({
            nickname: p.nickname,
            isCreator: p.isCreator,
            disconnected: p.disconnected || false
        }))
    }));
    console.log('Sending lobbies:', result)
    return result;
}

function broadcastLobbyList() {
    io.emit('lobbyList', getAvailableLobbies());
}

function schedulePlayerRemoval(lobbyId, nickname) {
    setTimeout(() => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        
        const player = lobby.players.find(p => p.nickname === nickname);
        if (player && player.disconnected) {
            console.log(`⏱️ Removing ${nickname} - reconnection timeout`);
            const playerIndex = lobby.players.indexOf(player);
            lobby.players.splice(playerIndex, 1);
            
            if (lobby.players.length === 0) {
                delete lobbies[lobbyId];
            } else {
                io.to(lobbyId).emit('playerRemoved', {
                    nickname: player.nickname,
                    reason: 'Reconnection timeout'
                });
                io.to(lobbyId).emit('playerUpdate', lobby.players);
            }
            
            broadcastLobbyList();
        }
    }, RECONNECT_TIMEOUT);
}

function autoDrawCards(lobbyID) {
    const lobby = lobbies[lobbyID];
    if (!lobby || !lobby.lastTrickWinner) return;

    const deck = lobby.remainingDeck;
    const winner = lobby.players.find(p => p.id === lobby.lastTrickWinner);
    const loser = lobby.players.find(p => p.id !== lobby.lastTrickWinner);

    if (!winner || !loser) return;
    if (deck.length === 0) return; 

    let drawn = {};

    if (deck.length > 0) {
        drawn.winnerCard = deck.shift();
        winner.hand.push(drawn.winnerCard);
    }
    if (deck.length > 0) {
        drawn.loserCard = deck.shift();
        loser.hand.push(drawn.loserCard);
    }

    if (deck.length === 0) {
        lobby.trump = null;
    }

    io.to(lobbyID).emit("cardsDrawn", {
        winnerID: winner.id,
        loserID: loser.id,
        ...drawn,
        remaining: deck.length,
        trump: lobby.trump
    });

    lobby.players.forEach(player => {
        io.to(player.id).emit('yourHand', {
            hand: player.hand
        });
    });

    console.log(`✅ Cards auto-drawn. Deck remaining: ${deck.length}`);
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.emit('playerID', { playerID: socket.id });
    socket.emit('lobbyList', getAvailableLobbies());

    socket.on('getLobbies', () => {
        socket.emit('lobbyList', getAvailableLobbies());
    });

    socket.on('joinLobby', (lobbyId, nickname, type = 'game', variant = '3') => {
        const playerID = socket.id;

        const lobby = lobbies[lobbyId];
        if (lobby) {
            const existingPlayer = lobby.players.find(p => p.nickname === nickname);
            if (existingPlayer) {
                console.log(`🔄 Player ${nickname} reconnecting to lobby ${lobbyId}`);
                
                existingPlayer.id = playerID;
                existingPlayer.disconnected = false;
                socket.join(lobbyId);
                
                socket.emit('playerID', { playerID });
                
                io.to(lobbyId).emit('playerUpdate', lobby.players);
                
                if (lobby.gameStarted) {
                    socket.emit('gameStarted', {
                        lobbyId,
                        type: lobby.type,
                        variant: lobby.variant,
                        trump: lobby.trump,
                        currentTurn: lobby.currentTurn,
                        navigateTo: `/multiplayer/${lobby.type}/${lobby.variant}?lobbyId=${lobbyId}`,
                        remainingDeckCount: lobby.remainingDeck.length,
                        players: lobby.players.map(p => ({
                            id: p.id,
                            nickname: p.nickname,
                            points: p.points,
                            cardCount: p.hand.length
                        }))
                    });
                    
                    socket.emit('yourHand', { hand: existingPlayer.hand });
                    
                    socket.emit('gameState', {
                        board: lobby.board,
                        currentTurn: lobby.currentTurn,
                        lastTrickWinner: lobby.lastTrickWinner,
                        trump: lobby.trump,
                        remainingDeckCount: lobby.remainingDeck.length,
                        players: lobby.players.map(p => ({
                            id: p.id,
                            nickname: p.nickname,
                            points: p.points,
                            cardCount: p.hand.length
                        }))
                    });
                }
                
                broadcastLobbyList();
                return;
            }
        }

        for (const [existingLobbyId, existingLobby] of Object.entries(lobbies)) {
            if (existingLobbyId !== lobbyId) {
                const playerInLobby = existingLobby.players.find(p => p.nickname === nickname);
                if (playerInLobby) {
                    socket.emit('alreadyInLobby');
                    return;
                }
            }
        }

        socket.join(lobbyId);
        let currentLobby = lobbies[lobbyId];

        if (!currentLobby) {
            currentLobby = {
                players: [],
                board: [],
                currentTurn: null,
                trump: null,
                type: type,
                variant: variant,
                creatorId: playerID,
                creatorNickname: nickname,
                remainingDeck: [],
                lastTrickWinner: null,
                gameStarted: false
            }
            lobbies[lobbyId] = currentLobby;
        }

        if (currentLobby.players.length >= 2) {
            socket.emit('lobbyFull');
            return;
        }

        if (currentLobby.gameStarted) {
            socket.emit('gameInProgress');
            return;
        }

        currentLobby.players.push({
            id: playerID,
            nickname: nickname,
            points: 0,
            hand: [],
            isCreator: currentLobby.players.length === 0,
            disconnected: false
        });

        io.to(lobbyId).emit('playerUpdate', currentLobby.players);
        socket.emit('playerID', { playerID });

        console.log(`✅ Player ${nickname} (${playerID}) joined lobby ${lobbyId}`);
        console.log(`   Total players: ${currentLobby.players.length}`);

        broadcastLobbyList();
    });

    socket.on('leaveLobby', (lobbyId, playerId, callback) => {
        const lobby = lobbies[lobbyId];

        if (!lobby) return callback({ success: false, message: 'Lobby does not exist' });

        const playerIndex = lobby.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return callback({ success: false, message: 'You are not in this lobby' });

        const leavingPlayer = lobby.players[playerIndex];
        
        // Remove the leaving player
        lobby.players.splice(playerIndex, 1);
        socket.leave(lobbyId);
        
        // Always dismantle the lobby when someone leaves
        io.to(lobbyId).emit('lobbyDismantled', `${leavingPlayer.nickname} has left the game`);

        // Force all remaining players to leave the lobby
        const room = io.sockets.adapter.rooms.get(lobbyId);
        if (room) {
            room.forEach(socketId => {
                io.sockets.sockets.get(socketId)?.leave(lobbyId);
            });
        }

        // Delete the lobby
        delete lobbies[lobbyId];

        callback({ success: true, message: 'Left the lobby successfully' });
        broadcastLobbyList();
    });

    socket.on('startGame', ({ lobbyId, variant }) => {

        const lobby = lobbies[lobbyId];
        if (!lobby) {
            console.error('❌ Lobby not found:', lobbyId);
            return;
        }

        lobby.gameStarted = true;
        lobby.variant = variant;
        const { hands, remainingDeck } = dealCards(lobby, variant);

        lobby.remainingDeck = remainingDeck;
        lobby.trump = remainingDeck.length ? remainingDeck.at(-1) : null;
        lobby.currentTurn = lobby.players[0].id;
        lobby.board = [];

        lobby.players.forEach(player => {
            player.hand = hands[player.id];
            player.points = 0;
        });

        const navigateTo = `/multiplayer/${lobby.type}/${variant}?lobbyId=${lobbyId}`;

        const gameStartedData = {
            lobbyId,
            type: lobby.type,
            variant: variant,
            trump: lobby.trump,
            currentTurn: lobby.currentTurn,
            navigateTo: navigateTo,
            remainingDeckCount: lobby.remainingDeck.length,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points,
                cardCount: hands[p.id].length
            }))
        };

        console.log('📤 Current turn set to:', lobby.currentTurn);
        console.log('📤 Player names:', lobby.players.map(p => `${p.nickname} (${p.id})`));
        
        io.to(lobbyId).emit('gameStarted', gameStartedData);

        lobby.players.forEach(player => {
            console.log(`📤 Sending hand to ${player.nickname} (${player.id}): ${hands[player.id].length} cards`);
            io.to(player.id).emit('yourHand', {
                hand: hands[player.id]
            });
        });

        console.log('✅ Game started successfully');
    });

    socket.on('playCard', ({ lobbyID, playerID, cardIndex }) => {
        const lobby = lobbies[lobbyID];
        if (!lobby) {
            console.log('❌ Lobby not found:', lobbyID);
            return;
        }

        const player = lobby.players.find(p => p.id === playerID);
        if (!player || !player.hand[cardIndex]) {
            console.log('❌ Player or card not found');
            return;
        }

        if (lobby.currentTurn && lobby.currentTurn !== playerID) {
            console.log('❌ Not this player\'s turn');
            return;
        }

        const card = player.hand.splice(cardIndex, 1)[0];
        lobby.board = lobby.board || [];
        lobby.board.push({ ...card, playedBy: playerID });

        console.log(`🃏 ${player.nickname} played ${card.title}`);
        console.log(`   Board now has ${lobby.board.length} cards`);

        if (lobby.board.length === 1) {
            const otherPlayer = lobby.players.find(p => p.id !== playerID);
            lobby.currentTurn = otherPlayer.id;

            console.log(`   Switching turn to ${otherPlayer.nickname} (${otherPlayer.id})`);

            io.to(lobbyID).emit('gameState', {
                board: lobby.board,
                currentTurn: lobby.currentTurn,
                lastTrickWinner: lobby.lastTrickWinner,
                trump: lobby.trump,
                remainingDeckCount: lobby.remainingDeck.length,
                players: lobby.players.map(p => ({
                    id: p.id,
                    nickname: p.nickname,
                    points: p.points,
                    cardCount: p.hand.length
                }))
            });

            lobby.players.forEach(p => {
                io.to(p.id).emit('yourHand', {
                    hand: p.hand
                });
            });
        }
        else if (lobby.board.length === 2) {
            const [c1, c2] = lobby.board;
            const trumpSuit = lobby.trump?.suit;
            let winnerId;

            console.log(`   Comparing cards:`);
            console.log(`   Card 1: ${c1.title} (suit: ${c1.suit}, power: ${c1.power})`);
            console.log(`   Card 2: ${c2.title} (suit: ${c2.suit}, power: ${c2.power})`);
            console.log(`   Trump suit: ${trumpSuit}`);

            if (c1.suit === c2.suit) {
                winnerId = c1.power > c2.power ? c1.playedBy : c2.playedBy;
                console.log(`   Same suit - winner by power`);
            } else if (c1.suit === trumpSuit) {
                winnerId = c1.playedBy;
                console.log(`   Card 1 is trump`);
            } else if (c2.suit === trumpSuit) {
                winnerId = c2.playedBy;
                console.log(`   Card 2 is trump`);
            } else {
                winnerId = c1.playedBy;
                console.log(`   No trump match - first card wins`);
            }

            const points = (c1.points || 0) + (c2.points || 0);
            const winner = lobby.players.find(p => p.id === winnerId);
            if (winner) {
                winner.points += points;
                console.log(`   🏆 ${winner.nickname} wins! +${points} points (total: ${winner.points})`);
            }

            lobby.lastTrickWinner = winnerId;
            lobby.currentTurn = null; 

            io.to(lobbyID).emit('gameState', {
                board: lobby.board,
                currentTurn: lobby.currentTurn,
                lastTrickWinner: lobby.lastTrickWinner,
                trump: lobby.trump,
                remainingDeckCount: lobby.remainingDeck.length,
                players: lobby.players.map(p => ({
                    id: p.id,
                    nickname: p.nickname,
                    points: p.points,
                    cardCount: p.hand.length
                }))
            });

            setTimeout(() => {
                io.to(lobbyID).emit('trickWinner', {
                    winnerId,
                    points,
                    cards: lobby.board
                });

                if (lobby.remainingDeck.length > 0) {
                    setTimeout(() => {
                        autoDrawCards(lobbyID);
                    }, 1000);
                }
                
                setTimeout(() => {
                    lobby.board = [];
                    lobby.currentTurn = winnerId; 

                    console.log(`   Clearing board, ${winner.nickname} plays next`);

                    const allHandsEmpty = lobby.players.every(p => p.hand.length === 0);
                    if (allHandsEmpty && lobby.remainingDeck.length === 0) {
                        console.log('🏁 Game over!');
                        const finalWinner = lobby.players.reduce((prev, curr) => 
                            curr.points > prev.points ? curr : prev
                        );
                        
                        io.to(lobbyID).emit('gameEnded', {
                            winnerId: finalWinner.id,
                            players: lobby.players.map(p => ({
                                id: p.id,
                                nickname: p.nickname,
                                points: p.points
                            }))
                        });
                        
                        lobby.gameStarted = false;
                        return;
                    }

                    io.to(lobbyID).emit('gameState', {
                        board: lobby.board,
                        currentTurn: lobby.currentTurn,
                        lastTrickWinner: lobby.lastTrickWinner,
                        trump: lobby.trump,
                        remainingDeckCount: lobby.remainingDeck.length,
                        players: lobby.players.map(p => ({
                            id: p.id,
                            nickname: p.nickname,
                            points: p.points,
                            cardCount: p.hand.length
                        }))
                    });

                    lobby.players.forEach(p => {
                        io.to(p.id).emit('yourHand', {
                            hand: p.hand
                        });
                    });
                }, 3000);
            }, 500); 
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        for (const [lobbyId, lobby] of Object.entries(lobbies)) {
            const player = lobby.players.find(p => p.id === socket.id);
            if (player) {
                // Remove the disconnected player
                const playerIndex = lobby.players.indexOf(player);
                lobby.players.splice(playerIndex, 1);

                // Always dismantle the lobby when someone disconnects
                io.to(lobbyId).emit('lobbyDismantled', `${player.nickname} has disconnected`);

                // Force all remaining players to leave
                const room = io.sockets.adapter.rooms.get(lobbyId);
                if (room) {
                    room.forEach(socketId => {
                        io.sockets.sockets.get(socketId)?.leave(lobbyId);
                    });
                }

                // Delete the lobby
                delete lobbies[lobbyId];
                break;
            }
        }

        broadcastLobbyList();
    });
});