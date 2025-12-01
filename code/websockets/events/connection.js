import { registerLobbyEvents } from "./lobby.js";

export const handleConnectionEvents = (io, socket) => {
  console.log(`Handling events for socket: ${socket.id}`);

  registerLobbyEvents(io, socket);

  socket.on("ping", () => {
    socket.emit("pong");
  });
};
