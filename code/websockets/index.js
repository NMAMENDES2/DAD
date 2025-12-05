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

    socket.on('joinLobby', (lobbyId, nickname, type = 'game') => {
        const playerID = socket.id;

        // Check if this NICKNAME is already in any lobby (prevents same account in multiple lobbies)
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
                creatorId: playerID,
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

    socket.on('startGame', (lobbyId) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        
        const hands = dealCards(lobby);
        
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