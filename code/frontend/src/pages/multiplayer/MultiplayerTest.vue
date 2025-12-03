<template>
  <div>
    <h2>Multiplayer Test</h2>
    <input v-model="nickname" placeholder="Nickname"/>
    <input v-model="lobby" placeholder="Lobby ID"/>
    <button @click="join">Join Lobby</button>

    <div v-if="store.hand.length">
      <h3>Your Hand</h3>
      <div v-for="(card, i) in store.hand" :key="i">
        <span>{{ card.suit }}{{ card.rank }}</span>
        <button @click="playCard(i)">Play</button>
      </div>
    </div>

    <div>
      <h3>Board</h3>
      <div v-for="c in store.board" :key="c.suit+c.rank">
        {{ c.suit }}{{ c.rank }} ({{ c.playedBy }})
      </div>
    </div>

    <div>
      <p>Trump: {{ store.trump?.suit }}{{ store.trump?.rank }}</p>
      <p>Opponent Cards: {{ store.opponentCardCount }}</p>
      <p>Current Turn: {{ store.currentTurn }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useGameStore } from "@/stores/multiplayerGame";

const store = useGameStore();
const nickname = ref("");
const lobby = ref("");

function join() {
  if (!nickname.value || !lobby.value) return;
  store.joinLobby(lobby.value, nickname.value);
}

function playCard(index) {
  store.playCard(index);
}
</script>
