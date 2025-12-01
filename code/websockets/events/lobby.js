import {
  lobbies,
  joinLobby,
  leaveLobby,
  getLobbyPlayers,
  getOrCreateLobby,
} from "../lobby/lobbyManager.js";

// simple in-memory games store for active rooms
const games = new Map()

export const registerLobbyEvents = (io, socket) => {
  socket.on("lobby:join", (payload = {}) => {
    // support both { lobbyId, username } and { roomCode }
    const lobbyId = payload.lobbyId || payload.roomCode
    const username = payload.username || payload.username || 'player'

    if (!lobbyId) {
      console.warn('[lobby] lobby:join called without lobbyId/roomCode', payload)
      return
    }

    const player = { id: socket.id, username };

    const lobby = joinLobby(lobbyId, player);

    socket.join(lobbyId);

    io.to(lobbyId).emit("lobby:update", {
      lobbyId,
      players: lobby.players,
    });

    console.log(`${socket.id} joined lobby ${lobbyId}`);
  });

  socket.on("lobby:leave", ({ lobbyId }) => {
    leaveLobby(lobbyId, socket.id);
    socket.leave(lobbyId);

    io.to(lobbyId).emit("lobby:update", {
      lobbyId,
      players: getLobbyPlayers(lobbyId),
    });

    console.log(`${socket.id} left lobby ${lobbyId}`);
  });

  socket.on("disconnect", () => {
    for (const [lobbyId, lobby] of Array.from(lobbies)) {
      if (lobby.players.find((p) => p.id === socket.id)) {
        leaveLobby(lobbyId, socket.id);

        io.to(lobbyId).emit("lobby:update", {
          lobbyId,
          players: getLobbyPlayers(lobbyId),
        });
      }
    }
  });

  // ---- Frontend-compatible events (used by the Vue client) ----
  socket.on('create-room', ({ roomCode, variant, mode }) => {
    console.log('[lobby] create-room', roomCode)
    // create or get lobby
    const lobby = getOrCreateLobby(roomCode)

    // add creator as first player
    const player = { id: socket.id, username: 'player' }
    joinLobby(roomCode, player)
    socket.join(roomCode)

    // notify creator (no ack provided here)
    socket.emit('room-created', { roomCode, players: getLobbyPlayers(roomCode).length })

    // broadcast updated lobby to room
    io.to(roomCode).emit('player-joined', { roomCode, players: getLobbyPlayers(roomCode).length })
  })

  // support acknowledgement callback: (payload, cb)
  socket.on('join-room', ({ roomCode } = {}, cb) => {
    console.log('[lobby] join-room', roomCode)
    // check lobby exists
    if (!lobbies.has(roomCode)) {
      console.log('[lobby] room not found', roomCode)
      if (typeof cb === 'function') return cb({ ok: false, reason: 'not-found' })
      return socket.emit('room-not-found')
    }

    const players = getLobbyPlayers(roomCode)
    if (players.length >= 2) {
      console.log('[lobby] room full', roomCode)
      if (typeof cb === 'function') return cb({ ok: false, reason: 'full' })
      return socket.emit('room-full')
    }

    const player = { id: socket.id, username: 'player' }
    const lobby = joinLobby(roomCode, player)
    socket.join(roomCode)

    // send ack to the joining socket
    if (typeof cb === 'function') cb({ ok: true, roomCode, players: lobby.players.length })
    else socket.emit('room-joined', { roomCode, players: lobby.players.length })

    // notify other players
    socket.to(roomCode).emit('player-joined', { roomCode, players: lobby.players.length })

    // if room now has 2 players, create a minimal game state and notify both
    if (lobby.players.length === 2) {
      const initialState = {
        roomCode,
        board: [],
        yourHand: [],
        trump: null,
        yourPoints: 0,
        opponentPoints: 0,
        yourMarks: 0,
        opponentMarks: 0,
        isYourTurn: false,
        winner: null
      }

      games.set(roomCode, initialState)

      // emit game-started to everyone in the room
      io.to(roomCode).emit('game-started', initialState)
      console.log('[lobby] game-started for', roomCode)
    }
  })

  socket.on('leave-room', ({ roomCode }) => {
    console.log('[lobby] leave-room', roomCode)
    leaveLobby(roomCode, socket.id)
    socket.leave(roomCode)

    io.to(roomCode).emit('player-joined', { roomCode, players: getLobbyPlayers(roomCode).length })
  })

  // Game state handlers
  socket.on('request-game-state', ({ roomCode } = {}, cb) => {
    console.log('[lobby] request-game-state', roomCode)
    if (!roomCode) return typeof cb === 'function' ? cb({ ok: false, reason: 'no-room' }) : null

    let state = games.get(roomCode)
    if (!state) {
      // If no game created yet, create a minimal default state
      state = {
        roomCode,
        board: [],
        yourHand: [],
        trump: null,
        yourPoints: 0,
        opponentPoints: 0,
        yourMarks: 0,
        opponentMarks: 0,
        isYourTurn: false,
        winner: null
      }
      games.set(roomCode, state)
    }

    if (typeof cb === 'function') cb({ ok: true, state })
    else socket.emit('game-state-update', state)
  })

  socket.on('play-card', ({ roomCode, cardIndex } = {}) => {
    console.log('[lobby] play-card', roomCode, cardIndex)
    const state = games.get(roomCode)
    if (!state) return
    // minimal placeholder: record a play on board
    state.board.push({ idx: cardIndex })
    // broadcast updated state
    io.to(roomCode).emit('game-state-update', state)
  })

  socket.on('resign', ({ roomCode } = {}) => {
    console.log('[lobby] resign', roomCode)
    const state = games.get(roomCode)
    if (!state) return
    state.winner = 'opponent'
    io.to(roomCode).emit('opponent-resigned', { gameState: state })
    games.delete(roomCode)
  })
};
