<script setup>
import { useAuthStore } from '@/stores/auth';
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  socket.emit('getLobbies');
});

const startGame = () => {
  if (players.value.length === 2) {
    const isHost = players.value.find(p => p.id === playerID.value && p.isCreator);
    if (!isHost) {
      toast.error('Only the host can start the game!');
      return;
    }
    socket.emit('startGame', {lobbyId: lobbyID.value, variant: lobbyVariant.value});

    router.push(`/multiplayer/${lobbyType.value}/${lobbyVariant.value}?lobbyId=${lobbyID.value}`);
  } else {
    toast.error('Need 2 players to start the game!');
  }
}

const createLobby = ({type='game', variant='3'}) => {
  const newLobbyID = Math.random().toString(36).substring(2, 8).toUpperCase();
  lobbyID.value = newLobbyID;
  socket.emit('joinLobby', newLobbyID, nickname.value, type, variant);
  lobbyType.value = type;
}

const joinLobby = ({id, type='game', variant='3'}) => {
  if (id && String(id).trim() !== '') {
    lobbyID.value = id;
    lobbyType.value = type;
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
        // Clear all local state
        lobbyID.value = '';
        lobbyType.value = '';
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
}

socket.on('playerID', (data) => {
  playerID.value = data.playerID;
  console.log('Received playerID:', playerID.value);
});

socket.on('alreadyInLobby', () => {
  toast.error('You are already in a lobby!');
});

socket.on('playerUpdate', (updatedPlayers) => {
  players.value = updatedPlayers;
});

socket.on('lobbyFull', () => {
  toast.error('Lobby is full!');
});

socket.on('lobbyList', (lobbies) => {
  availableLobbies.value = lobbies;
});

socket.on('lobbyDismantled', (message) => {
  toast.error(message);
  lobbyID.value;
  players.value = []
})

socket.on('gameStarted', (data) => {
  console.log("Your hand:", data.hand);
  console.log("All players:", data.players);
});

onUnmounted(() => {
  socket.off('playerID');
  socket.off('alreadyInLobby');
  socket.off('playerUpdate');
  socket.off('lobbyFull');
  socket.off('lobbyList');
});

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
          <Card v-for="lobby in availableLobbies" :key="lobby.id" :class="{ 'opacity-50': lobby.isFull }">
            <CardHeader>
              <CardTitle class="flex justify-between items-center text-lg">
                <span>{{ lobby.id }}</span>
                <Badge :variant="lobby.isFull ? 'destructive' : 'default'">
                  {{ lobby.playerCount }}/{{ lobby.maxPlayers }}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div>
                <p class="text-sm font-medium mb-1">Type: <span class="font-normal capitalize">{{ lobby.type }}</span>
                </p>
                <p class="text-sm font-medium mb-1">Players:</p>
                <ul class="text-sm text-muted-foreground">
                  <li v-for="(player, idx) in lobby.players" :key="idx" class="flex items-center gap-1">
                    {{ player.nickname }}
                    <Badge v-if="player.isCreator" variant="secondary" class="text-xs">Host</Badge>
                  </li>
                  <li v-if="lobby.playerCount === 0" class="italic">
                    No players yet
                  </li>
                </ul>
              </div>
              <Button @click="() => joinLobby({id: lobby.id, type: lobby.type, variant: lobby.variant})" :disabled="lobby.isFull" class="w-full">
                {{ lobby.isFull ? 'Full' : 'Join Lobby' }}
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
              <p v-if="players.length < 2" class="text-sm text-muted-foreground mt-1 capitalize">{{ lobbyType }} -
                Waiting for players...</p>
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
                  </div>
                </div>
                <div class="flex gap-2">
                  <Badge v-if="player.isCreator" variant="secondary">
                    Host
                  </Badge>
                  <Badge v-if="player.id === playerID && !player.isCreator">
                    You
                  </Badge>
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
                <Button :variant="lobbyVariant === '3' ? 'default' : 'outline'" @click="lobbyVariant = '3'"
                  class="flex-1">
                  Bisca de 3
                </Button>

                <Button :variant="lobbyVariant === '9' ? 'default' : 'outline'" @click="lobbyVariant = '9'"
                  class="flex-1">
                  Bisca de 9
                </Button>
              </div>

              <Button @click="startGame" class="w-full mt-4" size="lg" :disabled="!lobbyVariant">
                Start Game
              </Button>

            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  </div>
</template>