import { Server } from "socket.io"
import { dealCards } from "./game.js"

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Lobby logic
const lobbies = {};

function getAvailableLobbies() {
    const result = Object.entries(lobbies).map(([id, lobby]) => ({
        id,
        playerCount: lobby.players.length,
        maxPlayers: 2,
        isFull: lobby.players.length >= 2,
        type: lobby.type,
        creatorId: lobby.creatorId,
        creatorNickname: lobby.creatorNickname,
        players: lobby.players.map(p => ({
            nickname: p.nickname,
            isCreator: p.isCreator
        }))
    }));
    console.log('Sending lobbies:', result)
    return result;
}

function broadcastLobbyList() {
    io.emit('lobbyList', getAvailableLobbies());
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    socket.emit('lobbyList', getAvailableLobbies());

    socket.on('getLobbies', () => {
        socket.emit('lobbyList', getAvailableLobbies());
    });

    socket.on('joinLobby', (lobbyId, nickname, type = 'game', variant = '3') => {
        const playerID = socket.id;

        for (const [existingLobbyId, existingLobby] of Object.entries(lobbies)) {
            const playerInLobby = existingLobby.players.find(p => p.nickname === nickname);
            if (playerInLobby) {
                socket.emit('alreadyInLobby');
                return;
            }
        }

        socket.join(lobbyId);
        let lobby = lobbies[lobbyId];

        if (!lobby) {
            lobby = {
                players: [],
                deck: [],
                currentTurn: 0,
                trump: null,
                type: type,
                variant: variant,
                creatorId: playerID,
                remainingDeck: []
            }
            lobbies[lobbyId] = lobby;
        }

        if (lobby.players.length >= 2) {
            socket.emit('lobbyFull');
            return;
        }

        lobby.players.push({
            id: playerID,
            nickname: nickname,
            points: 0,
            hand: [],
            isCreator: lobby.players.length === 0
        });

        io.to(lobbyId).emit('playerUpdate', lobby.players);
        socket.emit('playerID', {
            playerID,
        })

        broadcastLobbyList();
    });

    socket.on('leaveLobby', (lobbyId, playerId, callback) => {
        const lobby = lobbies[lobbyId];

        if (!lobby) return callback({ success: false, message: 'Lobby does not exist' });

        const playerIndex = lobby.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return callback({ success: false, message: 'You are not in this lobby' });

        const isCreator = lobby.creatorId === playerId;

        lobby.players.splice(playerIndex, 1);
        socket.leave(lobbyId);

        if (isCreator) {
            io.to(lobbyId).emit('lobbyDismantled', 'The host has left the lobby');

            const room = io.sockets.adapter.rooms.get(lobbyId);
            if (room) {
                room.forEach(socketId => {
                    io.sockets.sockets.get(socketId)?.leave(lobbyId);
                });
            }

            delete lobbies[lobbyId]
        }

        if (lobby.players.length === 0) {
            delete lobbies[lobbyId];
        } else {
            io.to(lobbyId).emit('playerUpdate', lobby.players);
        }

        callback({ success: true, message: 'Left the lobby successfully' });
        broadcastLobbyList();
    });

    socket.on('startGame', ({ lobbyId, variant }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        const { hands, remainingDeck } = dealCards(lobby, variant);

        lobby.remainingDeck = remainingDeck;
        lobby.trump = remainingDeck.length ? remainingDeck.at(-1) : null;

        lobby.players.forEach(player => {
            player.hand = hands[player.id];
        });

        lobby.players.forEach(player => {
            io.to(player.id).emit('gameStarted', {
                hand: hands[player.id],
                players: lobby.players.map(p => ({
                    id: p.id,
                    nickname: p.nickname,
                    points: p.points,
                    cardCount: hands[p.id].length
                }))
            });
        });
    });

    socket.on("drawCard", ({ lobbyID, playerID }) => {
        const lobby = lobbies[lobbyID];
        if (!lobby) return;

        if (lobby.lastTrickWinner !== playerID) return;

        const deck = lobby.remainingDeck;

        const winner = lobby.players.find(p => p.id === lobby.lastTrickWinner);
        const loser = lobby.players.find(p => p.id !== lobby.lastTrickWinner);

        let drawn = {};

        if (deck.length > 0) {
            drawn.winnerCard = deck.shift();
        }
        if (deck.length > 0) {
            drawn.loserCard = deck.shift();
        }

        io.to(lobbyID).emit("cardsDrawn", {
            winnerID: winner.id,
            loserID: loser.id,
            ...drawn,
            remaining: deck.length
        });
});

socket.on('playCard', ({ lobbyID, playerID, cardIndex }) => {
    const lobby = lobbies[lobbyID];
    if (!lobby) return;

    const player = lobby.players.find(p => p.id === playerID);
    if (!player || !player.hand[cardIndex]) return;

    if (lobby.currentTurn && lobby.currentTurn !== playerID) return;

    const card = player.hand.splice(cardIndex, 1)[0];
    lobby.board = lobby.board || [];
    lobby.board.push({ ...card, playedBy: playerID });

    const otherPlayer = lobby.players.find(p => p.id !== playerID);
    lobby.currentTurn = otherPlayer.id;

    if (lobby.board.length === 2) {
        const [c1, c2] = lobby.board;
        const trumpSuit = lobby.trump?.suit;
        let winnerId;

        if (c1.suit === c2.suit) {
            winnerId = c1.rank > c2.rank ? c1.playedBy : c2.playedBy;
        } else if (c1.suit === trumpSuit) {
            winnerId = c1.playedBy;
        } else if (c2.suit === trumpSuit) {
            winnerId = c2.playedBy;
        } else {
            winnerId = c1.playedBy;
        }

        const points = (c1.points || 0) + (c2.points || 0);
        const winner = lobby.players.find(p => p.id === winnerId);
        if (winner) winner.points += points;

        lobby.lastTrickWinner = winnerId;
        lobby.board = [];
        lobby.currentTurn = winnerId;
    }

    lobby.players.forEach(p => {
        io.to(p.id).emit('playCard', {
            hand: p.hand,
            board: lobby.board,
            currentTurn: lobby.currentTurn,
            lastTrickWinner: lobby.lastTrickWinner
        });
    });
});


socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);

    for (const [lobbyId, lobby] of Object.entries(lobbies)) {
        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const isCreator = lobby.creatorId === socket.id;

            lobby.players.splice(playerIndex, 1);

            if (isCreator) {
                io.to(lobbyId).emit('lobbyDismantled', 'The host has disconnected');
                delete lobbies[lobbyId];
            } else if (lobby.players.length === 0) {
                delete lobbies[lobbyId];
            } else {
                io.to(lobbyId).emit('playerUpdate', lobby.players);
            }
        }
        break;
    }

    broadcastLobbyList();
});
});