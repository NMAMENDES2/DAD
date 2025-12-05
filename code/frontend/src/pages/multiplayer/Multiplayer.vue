<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const route = useRoute();
const authStore = useAuthStore();
const socket = inject('socket');

const mode = route.params.mode || 'game'; 
const variant = route.params.variant || '3'; 

const lobbyID = ref(route.query.lobbyID || '');
const playerID = ref('');
const nickname = ref(authStore.currentUser?.nickname || '');

const players = ref([]);
const hand = ref([]);
const board = ref([]);
const trump = ref(null);
const currentTurn = ref('');
const waitingForDraw = ref(false);

const isHost = computed(() => players.value.find(p => p.id === playerID.value)?.isCreator);

const getPlayer = (id) => players.value.find(p => p.id === id);

onMounted(() => {
  if (!socket) return;

  socket.emit('joinGame', { lobbyID: lobbyID.value, nickname, variant });

  socket.on('playerID', (data) => playerID.value = data.playerID);
  socket.on('playerUpdate', (data) => players.value = data);
  socket.on('gameStarted', (data) => {
    hand.value = data.hand;
    board.value = [];
    trump.value = data.trump;
    currentTurn.value = data.currentTurn;
    toast.success('Game started!');
  });

  socket.on('playCard', (data) => {
    board.value = data.board;
    currentTurn.value = data.currentTurn;
    hand.value = data.hand;
  });

  socket.on('cardsDrawn', (data) => {
    if (data.winnerID === playerID.value && data.winnerCard) hand.value.push(data.winnerCard);
    if (data.loserID === playerID.value && data.loserCard) hand.value.push(data.loserCard);
    waitingForDraw.value = false;
  });

  socket.on('playerDisconnected', (data) => {
    toast.error(`${data.nickname} disconnected`);
    players.value = players.value.filter(p => p.id !== data.id);
  });

  socket.on('gameEnded', (data) => {
    toast.success(`Game over! Winner: Player ${data.winner}`);
  });
});

onUnmounted(() => {
  if (!socket) return;
  socket.off('playerID');
  socket.off('playerUpdate');
  socket.off('gameStarted');
  socket.off('playCard');
  socket.off('cardsDrawn');
  socket.off('playerDisconnected');
  socket.off('gameEnded');
});

const playCard = (index) => {
  if (currentTurn.value !== playerID.value) return toast.error('Not your turn!');
  if (!hand.value[index]) return;
  socket.emit('playCard', { lobbyID: lobbyID.value, playerID: playerID.value, cardIndex: index });
};

const drawCards = () => {
  if (!waitingForDraw.value) return toast.error('No cards to draw yet');
  socket.emit('drawCard', { lobbyID: lobbyID.value, playerID: playerID.value });
};
</script>

<template>
<div class="p-4 max-w-6xl mx-auto space-y-6">
  <h2 class="text-xl font-bold">Multiplayer {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}</h2>

  <!-- Players List -->
  <Card>
    <CardHeader>
      <CardTitle>Players</CardTitle>
    </CardHeader>
    <CardContent>
      <ul>
        <li v-for="p in players" :key="p.id" class="flex justify-between items-center">
          <span>{{ p.nickname }}</span>
          <Badge>{{ p.hand?.length || 0 }} cards</Badge>
          <span v-if="p.isCreator">(Host)</span>
          <span v-else-if="p.id === playerID">(You)</span>
        </li>
      </ul>
    </CardContent>
  </Card>

  <!-- Board -->
  <Card>
    <CardHeader>
      <CardTitle>Board</CardTitle>
    </CardHeader>
    <CardContent class="flex gap-4 flex-wrap">
      <div v-if="board.length === 0" class="italic text-muted-foreground">No cards played yet</div>
      <div v-for="(c, i) in board" :key="i" class="p-2 border rounded text-center">
        <p>{{ getPlayer(c.playedBy)?.nickname || 'Unknown' }} played</p>
        <img v-if="c.image" :src="c.image" class="w-16 h-20 object-contain mx-auto" />
        <p v-if="c.rank && c.suit">{{ c.rank }} de {{ c.suit }}</p>
        <!-- Debug for unexpected object -->
        <pre v-else class="text-xs">{{ JSON.stringify(c, null, 2) }}</pre>
      </div>
    </CardContent>
  </Card>

  <!-- Your Hand -->
  <Card>
    <CardHeader>
      <CardTitle>Your Hand</CardTitle>
    </CardHeader>
    <CardContent class="flex gap-4 flex-wrap">
      <div
        v-for="(c, i) in hand"
        :key="i"
        class="border rounded p-1 cursor-pointer hover:shadow text-center"
        @click="playCard(i)"
      >
        <img v-if="c.image" :src="c.image" class="w-20 h-28 object-contain mx-auto" />
        <p v-if="c.rank && c.suit">{{ c.rank }} de {{ c.suit }}</p>
        <pre v-else class="text-xs">{{ JSON.stringify(c, null, 2) }}</pre>
      </div>
    </CardContent>
  </Card>

  <div v-if="waitingForDraw">
    <Button @click="drawCards">Draw Cards</Button>
  </div>

  <p v-if="trump">Trump: {{ trump.rank }} de {{ trump.suit }}</p>
</div>
</template>
