<script setup>
import { useAuthStore } from '@/stores/auth';
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/';
import { Button } from '@/components/ui/button';

const socket = inject('socket');
const authStore = useAuthStore();

const lobbyID = ref('');
const playerID = ref('');
const nickname = ref('');
const players = ref([]);
const availableLobbies = ref([]);

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

const createLobby = () => {
    const newLobbyID = Math.random().toString(36).substring(2, 8).toUpperCase();
    lobbyID.value = newLobbyID;
    joinLobby(newLobbyID);
}   

const joinLobby = (id = null) => {
    const targetLobbyID = id || lobbyID.value;
    if (targetLobbyID && String(targetLobbyID).trim() !== ''){
        socket.emit('joinLobby', targetLobbyID, nickname.value);
    }else{
        toast.error('Please enter a valid Lobby ID');
    }
}

const leaveLobby = () => {
    if (lobbyID.value) {
        socket.emit('leaveLobby', lobbyID.value, playerID.value, (response) => {
            if (response.success) {
                toast.success(response.message);
                lobbyID.value = '';
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
    toast.error('You are already in the lobby!');
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
    <div class="grid md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Join or Create Lobby</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Button 
                @click="createLobby"
                class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create New Lobby
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Available Lobbies</h2>
          <button 
            @click="refreshLobbies"
            class="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div v-if="availableLobbies.length === 0" class="text-center py-8 text-gray-500">
          No lobbies available. Create one to get started!
        </div>

        <div v-else class="space-y-3">
          <Card 
            v-for="lobby in availableLobbies" 
            :key="lobby.id"
            :class="{ 'opacity-50': lobby.isFull }"
          >
            <CardHeader>
              <CardTitle class="flex justify-between items-center text-lg">
                <span>{{ lobby.id }}</span>
                <span 
                  class="text-sm font-normal"
                  :class="lobby.isFull ? 'text-red-500' : 'text-green-500'"
                >
                  {{ lobby.playerCount }}/{{ lobby.maxPlayers }}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div>
                <p class="text-sm font-medium mb-1">Players:</p>
                <ul class="text-sm text-gray-600">
                  <li v-for="(player, idx) in lobby.players" :key="idx">
                    {{ player.nickname }}
                  </li>
                  <li v-if="lobby.playerCount === 0" class="italic">
                    No players yet
                  </li>
                </ul>
              </div>
              <Button
                @click="() => joinLobby(lobby.id)" 
                :disabled="lobby.isFull"
                class="w-full px-4 py-2 rounded-md transition-colors"
                :class="lobby.isFull 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'"
              >
                {{ lobby.isFull ? 'Full' : 'Join Lobby' }}
              </Button>
              <Button
              @click="() => leaveLobby(lobby.id)"
                class="w-full px-4 py-2 rounded-md transition-colors"
              >
              Leave Lobby
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>