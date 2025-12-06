<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ShopController extends Controller
{
    // Lista de itens disponíveis (Hardcoded para simplificar)
    private $items = [
        ['id' => 'avatar_1', 'type' => 'avatar', 'name' => 'Avatar Guerreiro', 'price' => 50],
        ['id' => 'avatar_2', 'type' => 'avatar', 'name' => 'Avatar Mago', 'price' => 100],
        ['id' => 'deck_blue', 'type' => 'deck', 'name' => 'Baralho Azul', 'price' => 75],
        ['id' => 'deck_red', 'type' => 'deck', 'name' => 'Baralho Vermelho', 'price' => 75],
    ];

    public function index(Request $request)
    {
        return response()->json($this->items);
    }

    public function buy(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'required|string',
        ]);

        $user = $request->user();
        $itemId = $validated['item_id'];
        
        // Encontrar item
        $item = collect($this->items)->firstWhere('id', $itemId);
        if (!$item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        // Verificar se já tem o item (guardado no campo custom)
        $customData = $user->custom ? json_decode($user->custom, true) : [];
        $inventory = $customData['inventory'] ?? [];

        if (in_array($itemId, $inventory)) {
            return response()->json(['message' => 'Already owned'], 400);
        }

        // Verificar saldo
        if ($user->coins_balance < $item['price']) {
            return response()->json(['message' => 'Insufficient coins'], 400);
        }

        // Processar Compra
        $user->coins_balance -= $item['price'];
        
        // Adicionar ao inventário
        $inventory[] = $itemId;
        $customData['inventory'] = $inventory;
        $user->custom = json_encode($customData);
        
        $user->save();

        // Registar transação (Game fee / Shop purchase) - Usamos tipo 3 (Game fee) ou crias um novo
        $user->coinTransactions()->create([
            'coin_transaction_type_id' => 3, // Adaptar ID se tiveres "Shop Purchase"
            'coins' => -$item['price'],
            'transaction_datetime' => now(),
            'custom' => json_encode(['item_id' => $itemId])
        ]);

        return response()->json(['message' => 'Item purchased', 'user' => $user]);
    }
    
    // Equipar Item
    public function equip(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'required|string',
            'type' => 'required|in:avatar,deck'
        ]);
        
        $user = $request->user();
        $customData = $user->custom ? json_decode($user->custom, true) : [];
        $inventory = $customData['inventory'] ?? [];
        
        if (!in_array($validated['item_id'], $inventory)) {
            return response()->json(['message' => 'Item not owned'], 403);
        }
        
        // Guardar preferência
        if ($validated['type'] == 'avatar') {
            $customData['equipped_avatar'] = $validated['item_id'];
        } else {
            $customData['equipped_deck'] = $validated['item_id'];
        }
        
        $user->custom = json_encode($customData);
        $user->save();
        
        return response()->json(['message' => 'Equipped', 'user' => $user]);
    }
}