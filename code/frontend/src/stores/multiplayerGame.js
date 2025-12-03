import { defineStore } from "pinia";
import { ref } from "vue";
import { socket } from "@/services/socket";

export const useGameStore = defineStore("game", () => {
  const hand = ref([]);
  const opponentCardCount = ref(0);
  const board = ref([]);
  const trump = ref(null);
  const currentTurn = ref(null);
  const lobbyId = ref(null);

  function joinLobby(id, nickname) {
    lobbyId.value = id;
    socket.emit("joinLobby", id, nickname);
  }

  function playCard(index) {
    if (!lobbyId.value) return;
    socket.emit("playCard", { lobbyId: lobbyId.value, cardIndex: index });
  }

  socket.on("gameState", (state) => {
    board.value = state.board;
    trump.value = state.trump;
    currentTurn.value = state.currentTurn;

    const myId = socket.id;
    hand.value = state.hands[myId] || [];
    const opponentId = Object.keys(state.hands).find(id => id !== myId);
    opponentCardCount.value = state.hands[opponentId] || 0;
  });

  return { hand, opponentCardCount, board, trump, currentTurn, joinLobby, playCard };
});
