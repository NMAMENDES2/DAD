import { defineStore } from 'pinia'
import { useAPIStore } from './api'

export const usePurchaseStore = defineStore('purchase', () => {
    const apiStore = useAPIStore()

    const purchase = async (purchaseData) => {
        const response = await apiStore.postPurchase(purchaseData);
        console.log(response.data)
        return response.data
    }

    return{
        purchase,
    }
})