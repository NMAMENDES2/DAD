<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input/'
import { Label } from '@/components/ui/label/'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card/'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar/'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const profileStore = useProfileStore()

// Form refs
const nameForm = ref({ name: '' })
const nicknameForm = ref({ nickname: '' })
const emailForm = ref({ email: '' })
const passwordForm = ref({ 
  current_password: '', 
  password: '', 
  password_confirmation: '' 
})
const deleteForm = ref({ password: '' })
const avatarFile = ref(null)

// Sync form values with currentUser whenever it changes
watchEffect(() => {
  if (authStore.currentUser) {
    nameForm.value.name = authStore.currentUser.name || ''
    nicknameForm.value.nickname = authStore.currentUser.nickname || ''
    emailForm.value.email = authStore.currentUser.email || ''
  }
})

// Avatar preview
const avatarPreview = computed(() => {
  if (avatarFile.value) {
    return URL.createObjectURL(avatarFile.value)
  }
  return authStore.currentUser?.avatar || null
})

const userInitials = computed(() => {
  const name = authStore.currentUser?.name || 'U'
  return name.charAt(0).toUpperCase()
})

// Update handlers
const handleUpdateName = async () => {
  try {
    const response = await profileStore.updateName(nameForm.value.name)
    if (response && response.user) {
      authStore.currentUser.name = response.user.name
      toast.success(profileStore.message || 'Name updated successfully')
    }
  } catch (error) {
    toast.error(profileStore.message || 'Failed to update name')
  }
}

const handleUpdateNickname = async () => {
  try {
    const response = await profileStore.updateNickname(nicknameForm.value.nickname)
    if (response && response.user) {
      authStore.currentUser.nickname = response.user.nickname
      toast.success(profileStore.message || 'Nickname updated successfully')
    }
  } catch (error) {
    toast.error(profileStore.message || 'Failed to update nickname')
  }
}

const handleUpdateEmail = async () => {
  try {
    const response = await profileStore.updateEmail({ email: emailForm.value.email })
    if (response && response.user) {
      authStore.currentUser.email = response.user.email
      toast.success(profileStore.message || 'Email updated successfully')
    }
  } catch (error) {
    toast.error(profileStore.message || 'Failed to update email')
  }
}

const handleUpdatePassword = async () => {
  try {
    await profileStore.updatePassword(passwordForm.value)
    passwordForm.value = { current_password: '', password: '', password_confirmation: '' }
    toast.success(profileStore.message || 'Password updated successfully')
  } catch (error) {
    toast.error(profileStore.message || 'Failed to update password')
  }
}

const handleAvatarChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    avatarFile.value = file
  }
}

const handleUploadAvatar = async () => {
  if (!avatarFile.value) return
  
  try {
    const response = await profileStore.updateAvatar(avatarFile.value)
    if (response && response.avatar_url) {
      // Update both avatar and the user object to ensure reactivity
      authStore.currentUser = {
        ...authStore.currentUser,
        avatar: response.avatar_url,
        photo_avatar_filename: response.user?.photo_avatar_filename
      }
      avatarFile.value = null
      toast.success(profileStore.message || 'Avatar updated successfully')
    }
  } catch (error) {
    toast.error(profileStore.message || 'Failed to upload avatar')
  }
}

const handleDeleteAccount = async () => {
  if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    return
  }
  
  try {
    await profileStore.deleteAccount(deleteForm.value.password)
    await authStore.logout()
    toast.success(profileStore.message || 'Account deleted successfully')
  } catch (error) {
    toast.error(profileStore.message || 'Failed to delete account')
  }
}
</script>

<template>
  <div class="container max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Profile Settings</h1>
    
    <!-- Profile Overview Card -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Profile Overview</CardTitle>
      </CardHeader>
      <CardContent class="flex items-center gap-6">
        <Avatar class="h-24 w-24">
          <AvatarImage :src="authStore.currentUser?.avatar" />
          <AvatarFallback class="text-2xl">{{ userInitials }}</AvatarFallback>
        </Avatar>
        <div>
          <h2 class="text-2xl font-semibold">{{ authStore.currentUser?.name }}</h2>
          <p class="text-muted-foreground">{{ authStore.currentUser?.email }}</p>
          <p v-if="authStore.currentUser?.nickname" class="text-sm text-muted-foreground">
            @{{ authStore.currentUser?.nickname }}
          </p>
          <div class="mt-2">
            <span class="text-sm font-medium">Balance: </span>
            <span class="text-lg font-bold text-primary">
              {{ authStore.currentUser?.coins_balance ?? 0 }}€
            </span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Edit Profile Tabs -->
    <Tabs default-value="general" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="avatar">Avatar</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="danger">Danger Zone</TabsTrigger>
      </TabsList>

      <!-- General Tab -->
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Update your name and nickname</CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Name -->
            <div class="space-y-2">
              <Label for="name">Name</Label>
              <Input 
                id="name" 
                v-model="nameForm.name" 
                placeholder="Enter your name"
              />
              <Button 
                @click="handleUpdateName" 
                :disabled="profileStore.loading"
                class="mt-2"
              >
                Update Name
              </Button>
            </div>

            <!-- Nickname -->
            <div class="space-y-2">
              <Label for="nickname">Nickname (Optional)</Label>
              <Input 
                id="nickname" 
                v-model="nicknameForm.nickname" 
                placeholder="Enter your nickname"
              />
              <Button 
                @click="handleUpdateNickname" 
                :disabled="profileStore.loading"
                class="mt-2"
              >
                Update Nickname
              </Button>
            </div>

            <!-- Email -->
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                v-model="emailForm.email" 
                placeholder="Enter your email"
              />
              <Button 
                @click="handleUpdateEmail" 
                :disabled="profileStore.loading"
                class="mt-2"
              >
                Update Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Avatar Tab -->
      <TabsContent value="avatar">
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload a new avatar (max 2MB)</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center gap-6">
              <Avatar class="h-32 w-32">
                <AvatarImage :src="avatarPreview" />
                <AvatarFallback class="text-4xl">{{ userInitials }}</AvatarFallback>
              </Avatar>
              <div class="space-y-2">
                <Input 
                  type="file" 
                  accept="image/*"
                  @change="handleAvatarChange"
                />
                <Button 
                  @click="handleUploadAvatar" 
                  :disabled="!avatarFile || profileStore.loading"
                >
                  Upload Avatar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Security Tab -->
      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password (min 8 characters)</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="current-password">Current Password</Label>
              <Input 
                id="current-password" 
                type="password"
                v-model="passwordForm.current_password" 
                placeholder="Enter current password"
              />
            </div>
            <div class="space-y-2">
              <Label for="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password"
                v-model="passwordForm.password" 
                placeholder="Enter new password"
              />
            </div>
            <div class="space-y-2">
              <Label for="confirm-password">Confirm New Password</Label>
              <Input 
                id="confirm-password" 
                type="password"
                v-model="passwordForm.password_confirmation" 
                placeholder="Confirm new password"
              />
            </div>
            <Button 
              @click="handleUpdatePassword" 
              :disabled="profileStore.loading"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Danger Zone Tab -->
      <TabsContent value="danger">
        <Card class="border-destructive">
          <CardHeader>
            <CardTitle class="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Permanently delete your account</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <p class="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <div class="space-y-2">
              <Label for="delete-password">Enter Password to Confirm</Label>
              <Input 
                id="delete-password" 
                type="password"
                v-model="deleteForm.password" 
                placeholder="Enter your password"
              />
            </div>
            <Button 
              variant="destructive"
              @click="handleDeleteAccount" 
              :disabled="profileStore.loading || !deleteForm.password"
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>