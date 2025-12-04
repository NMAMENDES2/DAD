import { defineStore } from "pinia";
import { ref } from "vue";

export const useGameStore = defineStore("game", () => {

  players = ref([]);

  return {
    players,
  };
});
