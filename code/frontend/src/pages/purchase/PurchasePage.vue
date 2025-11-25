<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Purchase Coins
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Choose an amount and complete the payment to buy coins
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handlePurchase">
        <div class="space-y-4 rounded-md shadow-sm">
          <div>
            <label for="paymentMethod" class="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <Input id="paymentMethod" v-model="formData.paymentMethod" type="text" required placeholder="Choose payment method" />
          </div>

          <div>
            <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <select id="amount" v-model="formData.amount" class="input select">
              <option value="5">5 Coins</option>
              <option value="10">10 Coins</option>
              <option value="20">20 Coins</option>
              <option value="50">50 Coins</option>
              <option value="100">100 Coins</option>
            </select>
          </div>

          <div>
            <label for="paymentReference" class="block text-sm font-medium text-gray-700 mb-1">
              Payment Reference
            </label>
            <Input id="paymentReference" v-model="formData.paymentReference" type="text" required placeholder="Enter payment reference" />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input id="email" v-model="formData.email" type="email" autocomplete="email" required placeholder="you@example.com" />
          </div>
        </div>

        <div>
          <Button type="submit" class="w-full">Purchase Coins</Button>
        </div>

        <div class="text-center text-sm">
          <span class="text-gray-600">Have questions?</span>
          <router-link to="/help" class="font-medium text-blue-600 hover:text-blue-500">Get Support</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Input } from '@/components/ui/input'; // Assuming you are using a custom Input component from ChadCN or your library
import { Button } from '@/components/ui/button'; // Assuming you are using a custom Button component
import { usePurchaseStore } from '@/stores/purchase'; // This should be your Pinia store for handling purchases
import { toast } from 'vue-sonner';
import { useRouter } from 'vue-router';

const purchaseStore = usePurchaseStore();
const router = useRouter();

const formData = ref({
  paymentMethod: '',
  amount: 10,
  paymentReference: '',
  email: ''
});

const handlePurchase = async () => {
  toast.promise(purchaseStore.purchase(formData.value), {
    loading: 'Processing Payment',
    success: (data) => {
      return `Successfully purchased ${data.coins} coins!`;
    },
    error: (data) => {
      return `[API Error] - ${data?.response?.data?.message || 'An error occurred during the purchase.'}`;
    },
  });

  router.push('/');
};
</script>

<style scoped>
/* Any additional custom styles if needed */
</style>
