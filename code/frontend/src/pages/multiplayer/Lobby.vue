<script setup>
import { useAuthStore } from '@/stores/auth';
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'vue-sonner';

const socket = inject('socket');
const authStore = useAuthStore();
const router = useRouter();

const lobbyID = ref('');
const playerID = ref('');
const nickname = ref('');
const players = ref([]);
const availableLobbies = ref([]);
const lobbyType = ref('');
const lobbyVariant = ref('3');

const maxPlayers = 2;

watch(
  () => authStore.currentUser,
  (user) => {
    if (user) {
      nickname.value = user.nickname;
      console.log("Nickname set to:", nickname.value)
    }
  },
  { immediate: true }
)

onMounted(() => {
  console.log('Lobby component mounted');
  
  if (!socket) {
    toast.error('Socket connection not available');
    return;
  }

  // FIXED: All socket listeners inside onMounted to prevent duplication
  socket.on('playerID', (data) => {
    playerID.value = data.playerID;
    console.log('✅ Player ID assigned:', playerID.value);
    
    // Authenticate user with server after receiving player ID
    if (authStore.user && lobbyID.value) {
      socket.emit('authenticateUser', {
        userId: authStore.user.id,
        lobbyId: lobbyID.value,
        playerId: playerID.value
      });
    }
  });

  socket.on('alreadyInLobby', () => {
    toast.error('You are already in a lobby!');
  });

  socket.on('playerUpdate', (updatedPlayers) => {
    console.log('Player update received:', updatedPlayers);
    players.value = updatedPlayers;
    
    // Warn if creator disconnected
    if (lobbyID.value) {
      const creator = updatedPlayers.find(p => p.isCreator);
      if (creator && creator.disconnected) {
        toast.warning('Host has disconnected. Lobby may close soon.');
      }
    }
  });

  socket.on('lobbyFull', () => {
    toast.error('Lobby is full!');
  });

  socket.on('lobbyList', (lobbies) => {
    console.log('Lobby list received:', lobbies.length, 'lobbies');
    availableLobbies.value = lobbies;
  });

  socket.on('lobbyDismantled', (message) => {
    toast.error(message);
    lobbyID.value = '';
    lobbyType.value = '';
    lobbyVariant.value = '3';
    players.value = [];
  });

  socket.on('gameStarted', (data) => {
    console.log('🎮 GAME STARTED EVENT RECEIVED:', data);
    
    if (data.navigateTo) {
      toast.success('Game starting!');
      router.push(data.navigateTo);
    } else {
      console.error('❌ No navigateTo path in gameStarted event!');
      toast.error('Failed to start game - missing navigation path');
    }
  });

  // Initial lobby list request
  socket.emit('getLobbies');
});

onUnmounted(() => {
  if (!socket) return;
  
  // Clean up all listeners
  socket.off('playerID');
  socket.off('alreadyInLobby');
  socket.off('playerUpdate');
  socket.off('lobbyFull');
  socket.off('lobbyList');
  socket.off('gameStarted');
  socket.off('lobbyDismantled');
});

const startGame = () => {
  if (players.value.length !== maxPlayers) {
    toast.error('Need 2 players to start the game!');
    return;
  }
  
  const isHost = players.value.find(p => p.id === playerID.value && p.isCreator);
  if (!isHost) {
    toast.error('Only the host can start the game!');
    return;
  }
  
  console.log('🎯 Host starting game with:', {
    lobbyId: lobbyID.value,
    variant: lobbyVariant.value
  });
  
  socket.emit('startGame', {
    lobbyId: lobbyID.value, 
    variant: lobbyVariant.value
  });
}

const createLobby = ({type='game', variant='3'}) => {
  const newLobbyID = Math.random().toString(36).substring(2, 8).toUpperCase();
  lobbyID.value = newLobbyID;
  lobbyType.value = type;
  lobbyVariant.value = variant;
  
  console.log('Creating lobby:', { newLobbyID, nickname: nickname.value, type, variant });
  socket.emit('joinLobby', newLobbyID, nickname.value, type, variant);
}

const joinLobby = ({id, type='game', variant='3'}) => {
  if (id && String(id).trim() !== '') {
    lobbyID.value = id;
    lobbyType.value = type;
    lobbyVariant.value = variant;
    
    console.log('Joining lobby:', { id, nickname: nickname.value, type, variant });
    socket.emit('joinLobby', id, nickname.value, type, variant);
  } else {
    toast.error('Invalid lobby ID');
  }
}

const leaveLobby = () => {
  if (lobbyID.value) {
    socket.emit('leaveLobby', lobbyID.value, playerID.value, (response) => {
      if (response.success) {
        toast.success(response.message);
        lobbyID.value = '';
        lobbyType.value = '';
        lobbyVariant.value = '3';
        players.value = [];
      } else {
        toast.error(response.message);
      }
    });
  } else {
    toast.error('You are not in a lobby!');
  }
}

const refreshLobbies = () => {
  socket.emit('getLobbies');
  toast.info('Refreshing lobby list...');
}
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto">
    <div v-if="players.length === 0" class="grid md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Join or Create Lobby</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <p class="text-sm font-medium">Nickname: <span class="font-normal">{{ nickname }}</span></p>
            </div>

            <div class="space-y-2">
              <Button @click="createLobby({type: 'game', variant: '3'})" class="w-full">
                Create Game Lobby
              </Button>

              <Button @click="createLobby({type: 'match', variant: '3'})" variant="secondary" class="w-full">
                Create Match Lobby
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Available Lobbies</h2>
          <Button @click="refreshLobbies" variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        <div v-if="availableLobbies.length === 0" class="text-center py-8 text-muted-foreground">
          No lobbies available. Create one to get started!
        </div>

        <div v-else class="space-y-3">
          <Card v-for="lobby in availableLobbies" :key="lobby.id" 
                :class="{ 'opacity-50': lobby.isFull || lobby.gameStarted }">
            <CardHeader>
              <CardTitle class="flex justify-between items-center text-lg">
                <span>{{ lobby.id }}</span>
                <div class="flex gap-2">
                  <Badge v-if="lobby.gameStarted" variant="destructive">In Progress</Badge>
                  <Badge :variant="lobby.isFull ? 'destructive' : 'default'">
                    {{ lobby.playerCount }}/{{ lobby.maxPlayers }}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div>
                <p class="text-sm font-medium mb-1">
                  Type: <span class="font-normal capitalize">{{ lobby.type }}</span>
                </p>
                <p class="text-sm font-medium mb-1">Players:</p>
                <ul class="text-sm text-muted-foreground">
                  <li v-for="(player, idx) in lobby.players" :key="idx" class="flex items-center gap-1">
                    {{ player.nickname }}
                    <Badge v-if="player.isCreator" variant="secondary" class="text-xs">Host</Badge>
                    <Badge v-if="player.disconnected" variant="destructive" class="text-xs">Offline</Badge>
                  </li>
                  <li v-if="lobby.playerCount === 0" class="italic">
                    No players yet
                  </li>
                </ul>
              </div>
              <Button 
                @click="() => joinLobby({id: lobby.id, type: lobby.type, variant: lobby.variant})" 
                :disabled="lobby.isFull || lobby.gameStarted" 
                class="w-full">
                {{ lobby.gameStarted ? 'Game in Progress' : lobby.isFull ? 'Full' : 'Join Lobby' }}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div v-else class="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div class="flex justify-between items-center">
            <div>
              <CardTitle class="text-2xl">Lobby: {{ lobbyID }}</CardTitle>
              <p v-if="players.length < 2" class="text-sm text-muted-foreground mt-1 capitalize">
                {{ lobbyType }} - Waiting for players...
              </p>
            </div>
            <Button @click="leaveLobby" variant="destructive">
              Leave Lobby
            </Button>
          </div>
        </CardHeader>

        <CardContent class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold mb-3">Players ({{ players.length }}/2)</h3>
            <div class="space-y-2">
              <div v-for="player in players" :key="player.id"
                class="flex items-center justify-between p-3 bg-secondary rounded-md">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                    {{ player.nickname.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium">{{ player.nickname }}</p>
                    <p class="text-xs text-muted-foreground">ID: {{ player.id.substring(0, 8) }}</p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Badge v-if="player.isCreator" variant="secondary">Host</Badge>
                  <Badge v-if="player.id === playerID && !player.isCreator">You</Badge>
                  <Badge v-if="player.disconnected" variant="destructive">Offline</Badge>
                </div>
              </div>

              <div v-if="players.length < 2"
                class="flex items-center justify-center p-3 bg-secondary/50 rounded-md border-2 border-dashed">
                <p class="text-muted-foreground italic">Waiting for player 2...</p>
              </div>
            </div>
          </div>

          <div v-if="players.length === 2">
            <div v-if="players.find(p => p.id === playerID && p.isCreator)" class="space-y-3">
              <h3 class="text-lg font-semibold">Choose Variant</h3>

              <div class="flex gap-3">
                <Button :variant="lobbyVariant === '3' ? 'default' : 'outline'" 
                        @click="lobbyVariant = '3'" class="flex-1">
                  Bisca de 3
                </Button>

                <Button :variant="lobbyVariant === '9' ? 'default' : 'outline'" 
                        @click="lobbyVariant = '9'" class="flex-1">
                  Bisca de 9
                </Button>
              </div>

              <Button @click="startGame" class="w-full mt-4" size="lg" :disabled="!lobbyVariant">
                Start Game
              </Button>
            </div>
            
            <div v-else class="text-center py-4">
              <p class="text-muted-foreground">Waiting for host to start the game...</p>
              <p class="text-xs text-muted-foreground mt-2">Your ID: {{ playerID.substring(0, 8) }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>