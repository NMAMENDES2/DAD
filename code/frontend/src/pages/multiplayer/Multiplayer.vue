<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const socket = inject('socket');

const mode = route.params.mode || 'game';
const variant = route.params.variant || '3';

const lobbyID = ref(route.query.lobbyId || '');
const playerID = ref('');
const nickname = ref(authStore.currentUser?.nickname || '');

const players = ref([]);
const hand = ref([]);
const board = ref([]);
const trump = ref(null);
const currentTurn = ref('');
const lastTrickWinner = ref('');
const remainingDeckCount = ref(0);
const gameStarted = ref(false);
const isReconnecting = ref(false);

const isMyTurn = computed(() => {
  const result = currentTurn.value === playerID.value;
  console.log('isMyTurn computed:', { currentTurn: currentTurn.value, playerID: playerID.value, result });
  return result;
});

const getPlayer = (id) => players.value.find(p => p.id === id);
const myPlayer = computed(() => getPlayer(playerID.value));
const opponentPlayer = computed(() => players.value.find(p => p.id !== playerID.value));

const attemptReconnect = () => {
  if (lobbyID.value && nickname.value) {
    console.log('🔄 Attempting to reconnect to lobby:', lobbyID.value);
    isReconnecting.value = true;
    socket.emit('joinLobby', lobbyID.value, nickname.value, mode, variant);
  }
};

onMounted(() => {
  if (!socket) {
    toast.error('Socket connection not available');
    return;
  }

  attemptReconnect();

  socket.on('playerID', (data) => {
    playerID.value = data.playerID;
    console.log('✅ Player ID assigned:', playerID.value);
  });

  socket.on('gameStarted', (data) => {
    console.log('🎮 Game started:', data);
    console.log('   My playerID:', playerID.value);
    console.log('   Current turn:', data.currentTurn);
    console.log('   Is my turn?', data.currentTurn === playerID.value);

    players.value = data.players;
    trump.value = data.trump;
    currentTurn.value = data.currentTurn;
    remainingDeckCount.value = data.remainingDeckCount || 0;
    gameStarted.value = true;

    if (isReconnecting.value) {
      toast.success('Reconnected to game!');
      isReconnecting.value = false;
    } else {
      toast.success('Game started!');
    }
  });

  socket.on('yourHand', (data) => {
    console.log('🃏 Your hand updated:', data.hand.length, 'cards');
    hand.value = data.hand;
  });

  socket.on('gameState', (data) => {
    console.log('📊 Game state update:', data);
    console.log('   Board cards:', data.board.length);
    console.log('   New current turn:', data.currentTurn);
    console.log('   My playerID:', playerID.value);
    console.log('   Is my turn now?', data.currentTurn === playerID.value);

    board.value = data.board;
    currentTurn.value = data.currentTurn;
    lastTrickWinner.value = data.lastTrickWinner;
    trump.value = data.trump;
    remainingDeckCount.value = data.remainingDeckCount;
    players.value = data.players;
  });

  socket.on('trickWinner', (data) => {
    console.log('🏆 Trick winner:', data);
    const winner = getPlayer(data.winnerId);
    toast.success(`${winner?.nickname || 'Player'} won the trick! +${data.points} points`);
  });

  socket.on('cardsDrawn', (data) => {
    console.log('🎴 Cards drawn:', data);
    trump.value = data.trump;
    remainingDeckCount.value = data.remaining;
    toast.info('Cards drawn from deck');
  });

  socket.on('playerUpdate', (updatedPlayers) => {
    console.log('👥 Player update:', updatedPlayers);
    players.value = updatedPlayers;
  });

  socket.on('playerDisconnected', (data) => {
    if (data.canReconnect) {
      toast.warning(`${data.nickname} disconnected (can reconnect)`);
    } else {
      toast.error(`${data.nickname} disconnected`);
    }
  });

  socket.on('playerRemoved', (data) => {
    toast.error(`${data.nickname} was removed: ${data.reason}`);
  });

  socket.on('lobbyDismantled', (message) => {
    toast.error(message);
    router.push('/multiplayer');
  });

  socket.on('gameEnded', (data) => {
    const winnerPlayer = getPlayer(data.winnerId);
    toast.success(`Game over! Winner: ${winnerPlayer?.nickname || 'Unknown'}`);
    gameStarted.value = false;
  });

  socket.on('alreadyInLobby', () => {
    toast.error('This nickname is already in another lobby');
    router.push('/multiplayer');
  });

  socket.on('lobbyFull', () => {
    toast.error('This lobby is full');
    router.push('/multiplayer');
  });

  socket.on('gameInProgress', () => {
    toast.error('Game already in progress');
    router.push('/multiplayer');
  });
});

onUnmounted(() => {
  if (!socket) return;
  socket.off('playerID');
  socket.off('gameStarted');
  socket.off('yourHand');
  socket.off('gameState');
  socket.off('cardsDrawn');
  socket.off('trickWinner');
  socket.off('playerUpdate');
  socket.off('playerDisconnected');
  socket.off('playerRemoved');
  socket.off('lobbyDismantled');
  socket.off('gameEnded');
  socket.off('alreadyInLobby');
  socket.off('lobbyFull');
  socket.off('gameInProgress');
});

const playCard = (index) => {
  console.log('🎯 Attempting to play card:', { index, isMyTurn: isMyTurn.value, currentTurn: currentTurn.value, myID: playerID.value });

  if (!isMyTurn.value) {
    toast.error('Not your turn!');
    return;
  }
  if (!hand.value[index]) return;

  console.log('✅ Playing card:', hand.value[index]);
  socket.emit('playCard', {
    lobbyID: lobbyID.value,
    playerID: playerID.value,
    cardIndex: index
  });
};

const leaveGame = () => {
  if (gameStarted.value) {
    const confirmLeave = confirm('Game is in progress. Are you sure you want to leave?');
    if (!confirmLeave) return;
    socket.emit('lobbyDismantle', (message) => {
      toast.info(message);
    })
  }

  if (lobbyID.value && playerID.value) {
    socket.emit('leaveLobby', lobbyID.value, playerID.value, (response) => {
      if (response.success) {
        router.push('/multiplayer');
      } else {
        toast.error(response.message);
        router.push('/multiplayer');
      }
    });
  } else {
    router.push('/multiplayer');
  }
};
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">
        Multiplayer {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
        <Badge variant="outline" class="ml-2">{{ variant }} cards</Badge>
      </h2>
      <div class="flex gap-2 items-center">
        <Badge v-if="playerID" variant="secondary" class="text-xs">ID: {{ playerID.slice(-4) }}</Badge>
        <Button @click="leaveGame" variant="outline">
          Leave Game
        </Button>
      </div>
    </div>

    <Card v-if="isReconnecting" class="bg-yellow-50 border-yellow-200">
      <CardContent class="pt-4">
        <div class="flex items-center gap-2">
          <div class="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
          <span class="text-yellow-800">Reconnecting to game...</span>
        </div>
      </CardContent>
    </Card>

    <Card v-if="gameStarted && !isReconnecting" class="bg-muted/50">
      <CardContent class="pt-4 text-xs">
        <div class="grid grid-cols-3 gap-2">
          <div>My ID: {{ playerID.slice(-6) }}</div>
          <div>Current Turn: {{ currentTurn.slice(-6) }}</div>
          <div class="font-bold" :class="isMyTurn ? 'text-green-600' : 'text-red-600'">
            {{ isMyTurn ? '✓ MY TURN' : '✗ NOT MY TURN' }}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="gameStarted && !isReconnecting">
      <CardContent class="pt-6">
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-muted-foreground">Current Turn</p>
            <p class="text-lg font-semibold">
              {{ isMyTurn ? '🎯 Your turn!' : `${getPlayer(currentTurn)?.nickname || 'Waiting'}'s turn` }}
            </p>
          </div>
          <div v-if="trump" class="text-center">
            <p class="text-sm text-muted-foreground">Trump Card</p>
            <div class="flex flex-col items-center mt-2">
              <img v-if="trump.image" :src="trump.image" class="w-16 h-20 object-contain" />
              <p class="text-xs mt-1">{{ trump.title }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm text-muted-foreground">Deck Remaining</p>
            <p class="text-lg font-semibold">{{ remainingDeckCount }} cards</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div v-if="gameStarted && !isReconnecting" class="grid md:grid-cols-2 gap-4">
      <Card :class="{ 'ring-2 ring-primary': isMyTurn }">
        <CardHeader>
          <CardTitle class="flex justify-between items-center">
            <span>{{ myPlayer?.nickname || 'You' }} 👤</span>
            <Badge variant="default">{{ myPlayer?.points || 0 }} points</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            {{ hand.length }} cards in hand
            <Badge v-if="isMyTurn" variant="default" class="ml-2">🎯 Your Turn</Badge>
          </p>
        </CardContent>
      </Card>

      <Card :class="{ 'ring-2 ring-primary': !isMyTurn && currentTurn }">
        <CardHeader>
          <CardTitle class="flex justify-between items-center">
            <span>{{ opponentPlayer?.nickname || 'Opponent' }} 👤</span>
            <Badge variant="secondary">{{ opponentPlayer?.points || 0 }} points</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            {{ opponentPlayer?.cardCount || 0 }} cards in hand
            <Badge v-if="!isMyTurn && currentTurn" variant="default" class="ml-2">🎯 Their Turn</Badge>
            <Badge v-if="opponentPlayer?.disconnected" variant="destructive" class="ml-2">⚠️ Disconnected</Badge>
          </p>
        </CardContent>
      </Card>
    </div>

    <Card v-if="gameStarted && !isReconnecting">
      <CardHeader>
        <CardTitle>Board</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="board.length === 0" class="text-center py-8 text-muted-foreground italic">
          No cards played yet
        </div>
        <div v-else class="flex gap-4 justify-center flex-wrap">
          <div v-for="(c, i) in board" :key="i" class="text-center">
            <p class="text-sm font-medium mb-2">{{ getPlayer(c.playedBy)?.nickname || 'Unknown' }}</p>
            <div class="p-2 border-2 rounded-lg bg-white shadow-lg">
              <img v-if="c.image" :src="c.image" class="w-24 h-32 object-contain mx-auto" />
              <p v-if="c.rank && c.suit" class="text-xs mt-1">{{ c.title }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="gameStarted && !isReconnecting">
      <CardHeader>
        <CardTitle class="flex justify-between items-center">
          <span>Your Hand</span>
          <Badge v-if="isMyTurn" variant="default" class="animate-pulse">Click a card to play!</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="hand.length === 0" class="text-center py-8 text-muted-foreground italic">
          No cards in hand
        </div>
        <div v-else class="flex gap-4 flex-wrap justify-center">
          <div v-for="(c, i) in hand" :key="i"
            class="border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-2 bg-white"
            :class="{
              'opacity-50 cursor-not-allowed': !isMyTurn,
              'hover:border-primary border-primary/50': isMyTurn,
              'hover:scale-105': isMyTurn
            }" @click="playCard(i)">
            <img v-if="c.image" :src="c.image" class="w-24 h-32 object-contain mx-auto" />
            <p v-if="c.rank && c.suit" class="text-xs text-center mt-1">{{ c.title }}</p>
            <div v-if="c.points" class="text-xs text-center text-muted-foreground">
              {{ c.points }} pts
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>