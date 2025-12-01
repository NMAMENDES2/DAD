export const lobbies = new Map();

export const getOrCreateLobby = (lobbyId) => {
  if (!lobbies.has(lobbyId)) {
    lobbies.set(lobbyId, {
      id: lobbyId,
      players: [],
    });
  }

  return lobbies.get(lobbyId);
};

export const joinLobby = (lobbyId, player) => {
  const lobby = getOrCreateLobby(lobbyId);

  if (!lobby.players.find((p) => p.id === player.id)) {
    lobby.players.push(player);
  }

  return lobby;
};

export const leaveLobby = (lobbyId, playerId) => {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  lobby.players = lobby.players.filter((p) => p.id !== playerId);

  if (lobby.players.length === 0) {
    lobbies.delete(lobbyId);
  }
};

export const getLobbyPlayers = (lobbyId) => {
  const lobby = lobbies.get(lobbyId);
  return lobby ? lobby.players : [];
};
