<template>
    <div>
        <NavigationMenu>
            <NavigationMenuList class="justify-around gap-20">
                <NavigationMenuItem>
                    <NavigationMenuTrigger v-if="userLoggedIn">Menu</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <li>

                            <NavigationMenuLink v-if="userLoggedIn" as-child>
                                <RouterLink to="/profile">Profile</RouterLink>
                            </NavigationMenuLink>
                            <NavigationMenuLink v-if="userLoggedIn" as-child>
                                <RouterLink to="/transactions">Transactions</RouterLink>
                            </NavigationMenuLink>
                            <NavigationMenuLink v-if="userLoggedIn" as-child>
                                <RouterLink to="/purchase">Purchase Coins</RouterLink>
                            </NavigationMenuLink>
                            <NavigationMenuLink v-if="userLoggedIn && authStore.currentUser?.type === 'A'" as-child>
                                <RouterLink to="/admin">Admin Dashboard</RouterLink>
                            </NavigationMenuLink>

                        </li>
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem v-if="!userLoggedIn">
                    <NavigationMenuLink>
                        <RouterLink to="/login">Login</RouterLink>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem v-else>
                    <NavigationMenuLink>
                        <a @click.prevent="logoutClickHandler">Logout</a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    </div>
</template>

<script setup>
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()


const emits = defineEmits(['logout'])
const { userLoggedIn } = defineProps(['userLoggedIn'])

const logoutClickHandler = () => {
    emits('logout')
}
</script>
