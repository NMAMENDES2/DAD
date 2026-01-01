import { Server } from "socket.io"
import { dealCards } from "./game.js"

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const lobbies = {};
const RECONNECT_TIMEOUT = 60000; // 60 seconds
const WINNING_SCORE = 120;
const MATCH_WINNING_MARKS = 4;

const userSocketMap = new Map(); // Use Map for better performance

// Calculate marks based on points
function calculateMarks(points) {
    if (points >= 120) {
        return 4; // Bandeira
    } else if (points >= 91) {
        return 2; // Capote
    } else if (points >= 61) {
        return 1; // Risca
    }
    return 0; // Draw or loss
}

// Check if match should end (someone reached 4 marks)
function checkMatchEnd(lobby) {
    if (lobby.type !== 'match') return false;
    
    const player1Marks = lobby.players[0].marks || 0;
    const player2Marks = lobby.players[1].marks || 0;
    
    return player1Marks >= MATCH_WINNING_MARKS || player2Marks >= MATCH_WINNING_MARKS;
}

async function saveGameToBackend(lobby, lobbyID, isMatchGame = false, matchId = null) {
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
        match_id: matchId || null,
    };

    console.log('💾 Saving game to backend:', gameData);

    try {
        if (isMatchGame) {
            io.to(lobbyID).emit('saveGameData', { ...gameData, isMatchGame: true });
        } else {
            io.to(lobbyID).emit('saveGameData', gameData);
        }
    } catch (error) {
        console.error('Failed to save game:', error);
    }
}

async function saveMatchToBackend(lobby, lobbyID) {
    const winner = lobby.players[0].marks >= MATCH_WINNING_MARKS 
        ? lobby.players[0] 
        : lobby.players[1];
    
    const totalPoints1 = lobby.players[0].totalMatchPoints || lobby.players[0].points;
    const totalPoints2 = lobby.players[1].totalMatchPoints || lobby.players[1].points;
    
    const matchData = {
        type: lobby.variant,
        status: 'Ended',
        player1_user_id: lobby.players[0].userId,
        player2_user_id: lobby.players[1].userId,
        player1_marks: lobby.players[0].marks || 0,
        player2_marks: lobby.players[1].marks || 0,
        player1_points: totalPoints1,
        player2_points: totalPoints2,
        winner_user_id: winner.userId,
        stake: lobby.stake || 3,
    };

    console.log('💾 Saving match to backend:', matchData);

    try {
        io.to(lobbyID).emit('saveMatchData', matchData);
    } catch (error) {
        console.error('Failed to save match:', error);
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

        // Handle match logic
        if (lobby.type === 'match') {
            handleMatchGameEnd(lobby, lobbyID, playerWith120);
        } else {
            // Standalone game
            if (lobby.players.every(p => p.userId)) {
                saveGameToBackend(lobby, lobbyID, false);
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
        }
        return true;
    }
    
    const allHandsEmpty = lobby.players.every(p => p.hand.length === 0);
    if (allHandsEmpty && lobby.remainingDeck.length === 0) {
        console.log('🏁 Game over - all cards played!');
        const finalWinner = lobby.players.reduce((prev, curr) => 
            curr.points > prev.points ? curr : prev
        );
        
        // Handle match logic
        if (lobby.type === 'match') {
            handleMatchGameEnd(lobby, lobbyID, finalWinner);
        } else {
            // Standalone game
            if (lobby.players.every(p => p.userId)) {
                saveGameToBackend(lobby, lobbyID, false);
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
        }
        return true;
    }
    
    return false;
}

function handleMatchGameEnd(lobby, lobbyID, winner) {
    // Initialize match data if first game
    if (!lobby.matchId) {
        lobby.matchId = null; // Will be set when backend creates match
        lobby.players[0].marks = 0;
        lobby.players[1].marks = 0;
        lobby.players[0].totalMatchPoints = 0;
        lobby.players[1].totalMatchPoints = 0;
    }
    
    // Calculate marks for this game
    const player1Points = lobby.players[0].points;
    const player2Points = lobby.players[1].points;
    
    // Check for draw
    if (player1Points === player2Points) {
        console.log('🤝 Game ended in a draw - no marks awarded');
        io.to(lobbyID).emit('gameEnded', {
            winnerId: null,
            isDraw: true,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points,
                marks: p.marks || 0
            }))
        });
        
        // Save game (draw)
        if (lobby.players.every(p => p.userId)) {
            saveGameToBackend(lobby, lobbyID, true, lobby.matchId);
        }
        
        // Reset for next game
        resetGameForNextRound(lobby);
        return;
    }
    
    // Calculate marks based on winner's points
    const winnerPoints = winner.points;
    const marks = calculateMarks(winnerPoints);
    
    // Update marks and total points
    const winnerPlayer = lobby.players.find(p => p.id === winner.id);
    if (winnerPlayer) {
        winnerPlayer.marks = (winnerPlayer.marks || 0) + marks;
        winnerPlayer.totalMatchPoints = (winnerPlayer.totalMatchPoints || 0) + winnerPoints;
    }
    
    const loserPlayer = lobby.players.find(p => p.id !== winner.id);
    if (loserPlayer) {
        loserPlayer.totalMatchPoints = (loserPlayer.totalMatchPoints || 0) + loserPlayer.points;
    }
    
    console.log(`📊 Marks updated: ${lobby.players[0].nickname} (${lobby.players[0].marks || 0}), ${lobby.players[1].nickname} (${lobby.players[1].marks || 0})`);
    
    // Save this game
    if (lobby.players.every(p => p.userId)) {
        saveGameToBackend(lobby, lobbyID, true, lobby.matchId);
    }
    
    // Check if match is over
    if (checkMatchEnd(lobby)) {
        console.log(`🏆 Match over! ${winnerPlayer.nickname} reached 4 marks!`);
        
        // Save match
        if (lobby.players.every(p => p.userId)) {
            saveMatchToBackend(lobby, lobbyID);
        }
        
        io.to(lobbyID).emit('matchEnded', {
            winnerId: winner.id,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points,
                marks: p.marks || 0,
                totalMatchPoints: p.totalMatchPoints || 0
            }))
        });
        
        lobby.gameStarted = false;
        lobby.matchEnded = true;
    } else {
        // Continue to next game
        io.to(lobbyID).emit('gameEnded', {
            winnerId: winner.id,
            isMatchGame: true,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points,
                marks: p.marks || 0,
                totalMatchPoints: p.totalMatchPoints || 0
            }))
        });
        
        // Reset for next game
        resetGameForNextRound(lobby);
        
        // Auto-start next game after a delay
        setTimeout(() => {
            if (!lobby.matchEnded && lobby.players.length === 2) {
                startNextGameInMatch(lobby, lobbyID);
            }
        }, 3000);
    }
}

function resetGameForNextRound(lobby) {
    lobby.players.forEach(player => {
        player.points = 0;
        player.hand = [];
    });
    lobby.board = [];
    lobby.currentTurn = null;
    lobby.lastTrickWinner = null;
    lobby.remainingDeck = [];
    lobby.trump = null;
}

function startNextGameInMatch(lobby, lobbyID) {
    console.log('🎮 Starting next game in match...');
    
    const { hands, remainingDeck } = dealCards(lobby, lobby.variant);
    
    lobby.remainingDeck = remainingDeck;
    lobby.trump = remainingDeck.length ? remainingDeck.at(-1) : null;
    lobby.currentTurn = lobby.players[0].id;
    lobby.board = [];
    lobby.gameStarted = true;
    
    lobby.players.forEach(player => {
        player.hand = hands[player.id];
        player.points = 0;
    });
    
    io.to(lobbyID).emit('gameStarted', {
        lobbyId: lobbyID,
        type: lobby.type,
        variant: lobby.variant,
        trump: lobby.trump,
        currentTurn: lobby.currentTurn,
        navigateTo: `/multiplayer/${lobby.type}/${lobby.variant}?lobbyId=${lobbyID}`,
        remainingDeckCount: lobby.remainingDeck.length,
        players: lobby.players.map(p => ({
            id: p.id,
            nickname: p.nickname,
            points: p.points,
            marks: p.marks || 0,
            totalMatchPoints: p.totalMatchPoints || 0,
            cardCount: hands[p.id].length
        }))
    });
    
    lobby.players.forEach(player => {
        io.to(player.id).emit('yourHand', { hand: hands[player.id] });
    });
    
    console.log('✅ Next game started in match');
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
                        stake: lobby.stake,
                        players: lobby.players.map(p => ({
                            id: p.id,
                            nickname: p.nickname,
                            points: p.points,
                            marks: p.marks || 0,
                            totalMatchPoints: p.totalMatchPoints || 0,
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
                            marks: p.marks || 0,
                            totalMatchPoints: p.totalMatchPoints || 0,
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
                gameStarted: false,
                matchId: null,
                stake: type === 'match' ? 3 : null, // Default stake for matches
                matchEnded: false
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

    socket.on('startGame', ({ lobbyId, variant, stake }) => {
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

        // Set stake for matches
        if (lobby.type === 'match' && stake) {
            lobby.stake = stake;
        }

        // Initialize match data if it's a match
        if (lobby.type === 'match') {
            lobby.matchId = null; // Will be set when backend creates match
            lobby.players[0].marks = 0;
            lobby.players[1].marks = 0;
            lobby.players[0].totalMatchPoints = 0;
            lobby.players[1].totalMatchPoints = 0;
            lobby.matchEnded = false;
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
            stake: lobby.stake,
            players: lobby.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points,
                marks: p.marks || 0,
                totalMatchPoints: p.totalMatchPoints || 0,
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
                    marks: p.marks || 0,
                    totalMatchPoints: p.totalMatchPoints || 0,
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
                    marks: p.marks || 0,
                    totalMatchPoints: p.totalMatchPoints || 0,
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
                            marks: p.marks || 0,
                            totalMatchPoints: p.totalMatchPoints || 0,
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