import {Server} from "socket.io"

const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

console.log(`Socket.IO server running on port ${PORT}`);

// In-memory lobby store
const lobbies = {};

function generateDeck() {
    const suits = ['c', 'o', 'e', 'p'];
    const ranks = ['1','2','3','4','5','6','7','11','12','13'];
    const cardPoints = { 1:11,7:10,13:4,11:3,12:2 };
    const deck = [];
    suits.forEach(suit => ranks.forEach(rank => {
        deck.push({ suit, rank:Number(rank), points: cardPoints[rank] || 0 });
    }));
    return deck;
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length-1; i>0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

io.on("connection", socket => {
    console.log("Player connected", socket.id);

    // Join a lobby
    socket.on("joinLobby", (lobbyId, nickname) => {
        if (!lobbies[lobbyId]) {
            lobbies[lobbyId] = { players: [], hands: {}, board: [], currentTurn:null, trump:null };
        }

        const lobby = lobbies[lobbyId];
        lobby.players.push({ id: socket.id, nickname });
        socket.join(lobbyId);
        console.log(`${nickname} joined lobby ${lobbyId}`);

        // Start game when 2 players joined
        if (lobby.players.length === 2) {
            startGame(lobbyId);
        }
    });

    socket.on("playCard", ({ lobbyId, cardIndex }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) return;

        const playerHand = lobby.hands[socket.id];
        if (!playerHand || !playerHand[cardIndex]) return;

        const card = playerHand.splice(cardIndex, 1)[0];
        lobby.board.push({ ...card, playedBy: socket.id });

        io.to(lobbyId).emit("gameState", serializeLobby(lobby));
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected", socket.id);
        Object.values(lobbies).forEach(lobby => {
            lobby.players = lobby.players.filter(p => p.id !== socket.id);
        });
    });
});

function startGame(lobbyId) {
    const lobby = lobbies[lobbyId];
    const deck = shuffle(generateDeck());
    lobby.players.forEach((p, i) => {
        lobby.hands[p.id] = deck.slice(i*9, (i+1)*9);
    });
    lobby.trump = deck[deck.length-1];
    lobby.currentTurn = lobby.players[0].id;

    io.to(lobbyId).emit("gameState", serializeLobby(lobby));
}

function serializeLobby(lobby) {
    const serialized = { board: lobby.board, trump: lobby.trump, hands:{}, currentTurn:lobby.currentTurn };
    lobby.players.forEach(p => {
        serialized.hands[p.id] = lobby.hands[p.id].length;
    });
    return serialized;
}
