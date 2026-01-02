<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAPIStore } from '@/stores/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const socket = inject('socket');
const apiStore = useAPIStore();

// FIXED: Move import.meta.env.DEV to script section
const isDev = import.meta.env.DEV;

const mode = route.params.mode || 'game';
const variant = route.params.variant || '3';

const lobbyID = ref(route.query.lobbyId || '');
const playerID = ref('');
const nickname = ref(authStore.currentUser?.nickname || '');

const moveTimeLeft = ref(20);
const moveTimerInterval = ref(null);

const players = ref([]);
const hand = ref([]);
const board = ref([]);
const trump = ref(null);
const currentTurn = ref('');
const lastTrickWinner = ref('');
const remainingDeckCount = ref(0);
const gameStarted = ref(false);
const isReconnecting = ref(false);

const resignGame = () => {
  if (!confirm('Are you sure you want to resign? This will forfeit the entire match.')) return;
  
  socket.emit('resignGame', {
    lobbyId: lobbyID.value,
    playerId: playerID.value
  });
};

const isMyTurn = computed(() => {
  const current = currentTurn.value;
  const myId = playerID.value;
  const result = current === myId;
  
  if (gameStarted.value) {
    console.log('🎯 Turn check:', { 
      currentTurn: current, 
      myPlayerId: myId, 
      isMyTurn: result 
    });
  }
  
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

onMounted(async() => {
  if (!authStore.user) {
    try {
      const res = await apiStore.getAuthUser()
      authStore.user = res.data
      nickname.value = authStore.user.nickname;
    } catch (e) {
      console.error('Failed to load auth user', e.response?.data || e.message)
      toast.error('Authentication required');
      router.push('/login');
      return;
    }
  }

  if (!socket) {
    toast.error('Socket connection not available');
    return;
  }

  attemptReconnect();

  socket.on('playerResigned', (data) => {
    toast.error(`${data.resignedNickname} ${data.reason === 'timeout' ? 'ran out of time' : 'resigned'}!`);
  });

  socket.on('playerID', (data) => {
    playerID.value = data.playerID;
    console.log('✅ Player ID assigned:', playerID.value);
    
    if (authStore.user && lobbyID.value) {
      socket.emit('authenticateUser', {
        userId: authStore.user.id,
        lobbyId: lobbyID.value,
        playerId: playerID.value
      });
    }
  });

  socket.on('gameStarted', (data) => {
    console.log('🎮 Game started:', data);

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

    if (moveTimerInterval.value) {
      clearInterval(moveTimerInterval.value);
    }

    if (data.currentTurn === playerID.value) {
    moveTimeLeft.value = 20;
    moveTimerInterval.value = setInterval(() => {
      moveTimeLeft.value--;
      if (moveTimeLeft.value <= 0) {
        clearInterval(moveTimerInterval.value);
      }
    }, 1000);
  }

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
    if (data.isMatchGame) {
      if (data.isDraw) {
        toast.info('Game ended in a draw - no marks awarded');
      } else {
        toast.success(`Game over! Winner: ${winnerPlayer?.nickname || 'Unknown'} (+${data.players.find(p => p.id === data.winnerId)?.marks || 0} marks)`);
      }
    } else {
      toast.success(`Game over! Winner: ${winnerPlayer?.nickname || 'Unknown'}`);
      gameStarted.value = false;
    }

    router.push('/multiplayer');
  });

  socket.on('matchEnded', (data) => {
    const winnerPlayer = getPlayer(data.winnerId);
    toast.success(`🏆 Match over! Winner: ${winnerPlayer?.nickname || 'Unknown'}`);
    gameStarted.value = false;

    router.push('/multiplayer');
  });

  socket.on('saveGameData', async (gameData) => {
    console.log('💾 Received game data to save:', gameData);
    
    try {
      let response;
      if (gameData.isMatchGame || mode === 'match') {
        // Save individual game within match
        response = await apiStore.createMultiplayerGame(gameData);
        toast.success('Game saved successfully!');
      } else {
        response = await apiStore.createMultiplayerGame(gameData);
        toast.success('Game saved successfully!');
      }
      console.log('✅ Game saved:', response.data);
    } catch (e) {
      console.error('❌ Failed to save game:', e.response?.data || e.message);
      
      // Show specific error message if available
      const errorMsg = e.response?.data?.message || 'Failed to save game results';
      toast.error(errorMsg);
    }
  });

  socket.on('saveMatchData', async (matchData) => {
    console.log('💾 Received match data to save:', matchData);
    
    try {
      const response = await apiStore.createMatch(matchData);
      toast.success('Match saved successfully!');
      console.log('✅ Match saved:', response.data);
    } catch (e) {
      console.error('❌ Failed to save match:', e.response?.data || e.message);
      
      // Show specific error message if available
      const errorMsg = e.response?.data?.message || 'Failed to save match results';
      toast.error(errorMsg);
    }
  });

  socket.on('cardPlayError', (data) => {
    toast.error(data.message);
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
  socket.off('saveGameData');
  socket.off('cardPlayError');
  socket.off('alreadyInLobby');
  socket.off('lobbyFull');
  socket.off('gameInProgress');

  if (moveTimerInterval.value) {
    clearInterval(moveTimerInterval.value);
  }
  socket.off('playerResigned');
});

const playCard = (index) => {
  console.log('🎯 Attempting to play card:', { 
    index, 
    isMyTurn: isMyTurn.value, 
    currentTurn: currentTurn.value, 
    myID: playerID.value 
  });

  if (!isMyTurn.value) {
    toast.error('Not your turn!');
    return;
  }
  
  if (!hand.value[index]) {
    toast.error('Invalid card');
    return;
  }

  console.log('✅ Playing card:', hand.value[index]);
  socket.emit('playCard', {
    lobbyID: lobbyID.value,
    playerID: playerID.value,
    cardIndex: index
  });
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
        <Button v-if="gameStarted" @click="resignGame" variant="destructive">
          Resign
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

    <!-- FIXED: Use isDev variable instead of import.meta.env.DEV -->
    <Card v-if="gameStarted && !isReconnecting && isDev" class="bg-muted/50">
      <CardContent class="pt-4 text-xs">
        <div class="grid grid-cols-3 gap-2">
          <div>My ID: {{ playerID.slice(-6) }}</div>
          <div>Current Turn: {{ currentTurn?.slice(-6) || "Resolving...."}}</div>
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

    <!-- Match Info (if match mode) -->
    <Card v-if="gameStarted && mode === 'match' && !isReconnecting" class="bg-blue-50 border-blue-200">
      <CardContent class="pt-4">
        <div class="flex justify-between items-center">
          <div class="text-center flex-1">
            <p class="text-sm text-muted-foreground">{{ getPlayer(playerID)?.nickname || 'You' }}</p>
            <p class="text-2xl font-bold">{{ getPlayer(playerID)?.marks || 0 }} marks</p>
            <p class="text-xs text-muted-foreground">{{ getPlayer(playerID)?.totalMatchPoints || 0 }} total points</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold">VS</p>
            <p class="text-xs text-muted-foreground">First to 4 wins</p>
          </div>
          <div class="text-center flex-1">
            <p class="text-sm text-muted-foreground">{{ opponentPlayer?.nickname || 'Opponent' }}</p>
            <p class="text-2xl font-bold">{{ opponentPlayer?.marks || 0 }} marks</p>
            <p class="text-xs text-muted-foreground">{{ opponentPlayer?.totalMatchPoints || 0 }} total points</p>
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
            <Badge v-if="isMyTurn && moveTimeLeft > 0" :variant="moveTimeLeft <= 5 ? 'destructive' : 'default'"
              class="ml-2">
              ⏱️ {{ moveTimeLeft }}s
            </Badge>
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
            }" 
            @click="playCard(i)">
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