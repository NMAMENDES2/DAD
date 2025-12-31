import { Server } from "socket.io"
import { dealCards } from "./game.js"

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const lobbies = {};
const RECONNECT_TIMEOUT = 60000; // 60 seconds
const WINNING_SCORE = 120;

const userSocketMap = new Map(); // Use Map for better performance

async function saveGameToBackend(lobby, lobbyID) {
    const winner = lobby.players.reduce((prev, curr) => 
        curr.points > prev.points ? curr : prev
    );
    
    const gameData = {
        type: lobby.variant,
        status: 'Ended',
        player1_user_id: lobby.players[0].userId,
        player2_user_id: lobby.players[1].userId,
        player1_points: lobby.players[0].points,
        player2_points: lobby.players[1].points,
        winner_user_id: winner.userId,
    };

    console.log('💾 Saving game to backend:', gameData);

    try {
        io.to(lobbyID).emit('saveGameData', gameData);
    } catch (error) {
        console.error('Failed to save game:', error);
    }
}

// FIXED: Complete authenticateUser handler
function handleUserAuthentication(socket, { userId, lobbyId, playerId }) {
    if (!userId || !lobbyId || !playerId) {
        console.error('❌ Invalid authentication data:', { userId, lobbyId, playerId });
        return;
    }

    userSocketMap.set(userId, playerId);

    const lobby = lobbies[lobbyId];
    if (!lobby) {
        console.error('❌ Lobby not found for authentication:', lobbyId);
        return;
    }

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) {
        console.error('❌ Player not found in lobby:', playerId);
        return;
    }

    player.userId = userId;
    console.log(`✅ Authenticated user ${userId} for player ${player.nickname}`);
}

function getAvailableLobbies() {
    return Object.entries(lobbies).map(([id, lobby]) => ({
        id,
        playerCount: lobby.players.filter(p => !p.disconnected).length,
        maxPlayers: 2,
        isFull: lobby.players.filter(p => !p.disconnected).length >= 2,
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
            
            // Clean up user socket map
            if (player.userId) {
                userSocketMap.delete(player.userId);
            }
            
            const playerIndex = lobby.players.indexOf(player);
            lobby.players.splice(playerIndex, 1);
            
            if (player.isCreator) {
                io.to(lobbyId).emit('lobbyDismantled', `Lobby creator ${player.nickname} failed to reconnect`);
                delete lobbies[lobbyId];
            } else if (lobby.players.length === 0) {
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

    if (!winner || !loser || deck.length === 0) return;

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
        io.to(player.id).emit('yourHand', { hand: player.hand });
    });

    console.log(`✅ Cards auto-drawn. Deck remaining: ${deck.length}`);
}

function checkGameEnd(lobby, lobbyID) {
    const playerWith120 = lobby.players.find(p => p.points >= WINNING_SCORE);
    
    if (playerWith120) {
        console.log(`🏁 Game over! ${playerWith120.nickname} reached ${playerWith120.points} points`);

        if (lobby.players.every(p => p.userId)) {
            saveGameToBackend(lobby, lobbyID);
        }
        
        io.to(lobbyID).emit('gameEnded', {
            winnerId: playerWith120.id,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points
            }))
        });
        
        lobby.gameStarted = false;
        return true;
    }
    
    const allHandsEmpty = lobby.players.every(p => p.hand.length === 0);
    if (allHandsEmpty && lobby.remainingDeck.length === 0) {
        console.log('🏁 Game over - all cards played!');
        const finalWinner = lobby.players.reduce((prev, curr) => 
            curr.points > prev.points ? curr : prev
        );
        
        if (lobby.players.every(p => p.userId)) {
            saveGameToBackend(lobby, lobbyID);
        }
        
        io.to(lobbyID).emit('gameEnded', {
            winnerId: finalWinner.id,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points
            }))
        });
        
        lobby.gameStarted = false;
        return true;
    }
    
    return false;
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.emit('playerID', { playerID: socket.id });
    socket.emit('lobbyList', getAvailableLobbies());

    socket.on('getLobbies', () => {
        socket.emit('lobbyList', getAvailableLobbies());
    });

    // FIXED: Proper authenticateUser handler
    socket.on('authenticateUser', (data) => {
        handleUserAuthentication(socket, data);
    });

    socket.on('joinLobby', (lobbyId, nickname, type = 'game', variant = '3') => {
        const playerID = socket.id;

        // Check if player already in another lobby
        for (const [existingLobbyId, existingLobby] of Object.entries(lobbies)) {
            const playerInLobby = existingLobby.players.find(p => p.nickname === nickname && !p.disconnected);
            if (playerInLobby && existingLobbyId !== lobbyId) {
                socket.emit('alreadyInLobby');
                return;
            }
        }

        const lobby = lobbies[lobbyId];
        
        // Handle reconnection
        if (lobby) {
            const existingPlayer = lobby.players.find(p => p.nickname === nickname);
            if (existingPlayer) {
                console.log(`🔄 Player ${nickname} reconnecting to lobby ${lobbyId}`);
                
                existingPlayer.id = playerID;
                existingPlayer.disconnected = false;
                existingPlayer.lastSeen = Date.now();
                
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
            
            const activePlayers = lobby.players.filter(p => !p.disconnected);
            if (activePlayers.length >= 2) {
                socket.emit('lobbyFull');
                return;
            }

            if (lobby.gameStarted) {
                socket.emit('gameInProgress');
                return;
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
            };
            lobbies[lobbyId] = currentLobby;
        }

        currentLobby.players.push({
            id: playerID,
            nickname: nickname,
            points: 0,
            hand: [],
            isCreator: currentLobby.players.length === 0,
            disconnected: false,
            lastSeen: Date.now()
        });

        io.to(lobbyId).emit('playerUpdate', currentLobby.players);
        socket.emit('playerID', { playerID });

        console.log(`✅ Player ${nickname} (${playerID}) joined lobby ${lobbyId}`);
        broadcastLobbyList();
    });

    socket.on('leaveLobby', (lobbyId, playerId, callback) => {
        const lobby = lobbies[lobbyId];

        if (!lobby) return callback({ success: false, message: 'Lobby does not exist' });

        const playerIndex = lobby.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return callback({ success: false, message: 'You are not in this lobby' });

        const leavingPlayer = lobby.players[playerIndex];
        
        // Clean up user socket map
        if (leavingPlayer.userId) {
            userSocketMap.delete(leavingPlayer.userId);
        }
        
        lobby.players.splice(playerIndex, 1);
        socket.leave(lobbyId);
        
        if (leavingPlayer.isCreator || lobby.gameStarted) {
            io.to(lobbyId).emit('lobbyDismantled', 
                lobby.gameStarted 
                    ? `${leavingPlayer.nickname} has left the game` 
                    : `Lobby creator ${leavingPlayer.nickname} has left`
            );

            const room = io.sockets.adapter.rooms.get(lobbyId);
            if (room) {
                room.forEach(socketId => {
                    io.sockets.sockets.get(socketId)?.leave(lobbyId);
                });
            }

            delete lobbies[lobbyId];
        } else {
            io.to(lobbyId).emit('playerUpdate', lobby.players);
            
            if (lobby.players.length === 0) {
                delete lobbies[lobbyId];
            }
        }

        callback({ success: true, message: 'Left the lobby successfully' });
        broadcastLobbyList();
    });

    socket.on('startGame', ({ lobbyId, variant }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) {
            console.error('❌ Lobby not found:', lobbyId);
            return;
        }

        const activePlayers = lobby.players.filter(p => !p.disconnected);
        if (activePlayers.length !== 2) {
            console.error('❌ Cannot start game: need exactly 2 active players');
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

        io.to(lobbyId).emit('gameStarted', {
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
        });

        lobby.players.forEach(player => {
            io.to(player.id).emit('yourHand', { hand: hands[player.id] });
        });

        console.log('✅ Game started successfully');
        broadcastLobbyList();
    });

    socket.on('playCard', ({ lobbyID, playerID, cardIndex }) => {
        const lobby = lobbies[lobbyID];
        
        // FIXED: Validate game state before allowing card play
        if (!lobby) {
            socket.emit('cardPlayError', { message: 'Lobby not found' });
            return;
        }

        if (!lobby.gameStarted) {
            socket.emit('cardPlayError', { message: 'Game has not started yet' });
            return;
        }

        const player = lobby.players.find(p => p.id === playerID);
        if (!player) {
            socket.emit('cardPlayError', { message: 'Player not found' });
            return;
        }

        if (!player.hand[cardIndex]) {
            socket.emit('cardPlayError', { message: 'Invalid card' });
            return;
        }

        if (lobby.currentTurn && lobby.currentTurn !== playerID) {
            socket.emit('cardPlayError', { message: 'Not your turn!' });
            return;
        }

        const card = player.hand.splice(cardIndex, 1)[0];
        lobby.board = lobby.board || [];
        lobby.board.push({ ...card, playedBy: playerID });

        console.log(`🃏 ${player.nickname} played ${card.title}`);

        if (lobby.board.length === 1) {
            const otherPlayer = lobby.players.find(p => p.id !== playerID);
            lobby.currentTurn = otherPlayer.id;

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
                io.to(p.id).emit('yourHand', { hand: p.hand });
            });
        }
        else if (lobby.board.length === 2) {
            const [c1, c2] = lobby.board;
            const trumpSuit = lobby.trump?.suit;
            let winnerId;

            if (c1.suit === c2.suit) {
                winnerId = c1.power > c2.power ? c1.playedBy : c2.playedBy;
            } else if (c1.suit === trumpSuit) {
                winnerId = c1.playedBy;
            } else if (c2.suit === trumpSuit) {
                winnerId = c2.playedBy;
            } else {
                winnerId = c1.playedBy;
            }

            const points = (c1.points || 0) + (c2.points || 0);
            const winner = lobby.players.find(p => p.id === winnerId);
            if (winner) {
                winner.points += points;
                console.log(`🏆 ${winner.nickname} wins! +${points} points (total: ${winner.points})`);
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

                if (checkGameEnd(lobby, lobbyID)) return;

                if (lobby.remainingDeck.length > 0) {
                    setTimeout(() => autoDrawCards(lobbyID), 1000);
                }
                
                setTimeout(() => {
                    lobby.board = [];
                    lobby.currentTurn = winnerId;

                    if (checkGameEnd(lobby, lobbyID)) return;

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
                        io.to(p.id).emit('yourHand', { hand: p.hand });
                    });
                }, 3000);
            }, 500);
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        // Clean up user socket map
        for (const [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                break;
            }
        }

        for (const [lobbyId, lobby] of Object.entries(lobbies)) {
            const player = lobby.players.find(p => p.id === socket.id);
            if (!player) continue;

            player.disconnected = true;
            player.lastSeen = Date.now();

            console.log(`⏳ ${player.nickname} marked disconnected in lobby ${lobbyId}`);

            io.to(lobbyId).emit('playerUpdate', lobby.players);

            if (!lobby.gameStarted || player.isCreator) {
                io.to(lobbyId).emit('lobbyDismantled', 
                    player.isCreator 
                        ? `Lobby creator ${player.nickname} has disconnected` 
                        : `${player.nickname} has disconnected`
                );
                
                const room = io.sockets.adapter.rooms.get(lobbyId);
                if (room) {
                    room.forEach(socketId => {
                        io.sockets.sockets.get(socketId)?.leave(lobbyId);
                    });
                }
                
                delete lobbies[lobbyId];
            } else {
                schedulePlayerRemoval(lobbyId, player.nickname);
            }
            
            break;
        }
        
        broadcastLobbyList();
    });
});