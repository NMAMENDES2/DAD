<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Purchase Coins
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Choose a payment method and complete the payment to buy coins
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handlePurchase">
        <div class="space-y-4 rounded-md shadow-sm">
          
          <!-- Payment Method Selection -->
          <div>
            <label for="paymentMethod" class="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select id="paymentMethod" v-model="formData.type" required class="input select">
              <option value="">Select Payment Method</option>
              <option value="MBWAY">MBWAY</option>
              <option value="PAYPAL">PayPal</option>
              <option value="IBAN">IBAN</option>
              <option value="VISA">Visa</option>
            </select>
          </div>

          <!-- Payment Reference (Dynamic based on payment method) -->
          <div>
            <label for="paymentReference" class="block text-sm font-medium text-gray-700 mb-1">
              Payment Reference
            </label>
            <input 
              id="paymentReference" 
              v-model="formData.reference" 
              type="text" 
              :placeholder="referencePlaceholder"
              required 
              class="input"
            />
          </div>

          <!-- Payment Value -->
          <div>
            <label for="value" class="block text-sm font-medium text-gray-700 mb-1">
              Value (Coins)
            </label>
            <input 
              id="value" 
              v-model="formData.value" 
              type="number" 
              min="1" 
              max="100" 
              required 
              class="input" 
            />
          </div>

        </div>

        <!-- Submit Button -->
        <div>
          <Button type="submit" class="w-full">Purchase Coins</Button>
        </div>

        <!-- Support Link -->
        <div class="text-center text-sm">
          <span class="text-gray-600">Have questions?</span>
          <router-link to="/help" class="font-medium text-blue-600 hover:text-blue-500">Get Support</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Input } from '@/components/ui/input'; 
import { Button } from '@/components/ui/button'; 
import { usePurchaseStore } from '@/stores/purchase'; 
import { toast } from 'vue-sonner'; 
import { useRouter } from 'vue-router';

const purchaseStore = usePurchaseStore();
const router = useRouter();

const formData = ref({
  type: 'MBWAY',
  reference: '912532423',
  value: 10,
});

// Dynamically change the placeholder for payment reference based on the selected payment method
const referencePlaceholder = computed(() => {
  switch (formData.value.type) {
    case 'MBWAY':
      return 'Enter phone number (e.g., 912345678)';
    case 'PAYPAL':
      return 'Enter PayPal email address';
    case 'IBAN':
      return 'Enter IBAN';
    case 'VISA':
      return 'Enter Visa card number';
    default:
      return 'Enter payment reference';
  }
});

// Handle purchase submission
const handlePurchase = async () => {
  // Basic validation for payment method, reference, and value
  if (!formData.value.type || !formData.value.reference || !formData.value.value) {
    toast.error("All fields are required!");
    return;
  }

  // Call the store to handle purchase
  toast.promise(purchaseStore.purchase(formData.value), {
    loading: 'Processing Payment...',
    success: (data) => {
      return `Successfully purchased ${data.coins} coins!`;
    },
    error: (data) => {
      return `[API Error] - ${data?.response?.data?.message || 'An error occurred during the purchase.'}`;
    },
  });

  // Redirect after success
  router.push('/');
};
</script>

<style scoped>
/* Any custom styles */
</style>
