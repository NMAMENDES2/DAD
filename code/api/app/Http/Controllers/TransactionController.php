<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CoinTransaction; 

class TransactionController extends Controller
{
    // Listar Transações (Já tinhas este)
    public function getTransactions(Request $request)
    {
        $user = $request->user();
        $query = $user->coinTransactions()->with('type');

        // Ordenação
        $sortBy = $request->input('sort_by', 'transaction_datetime');
        $sortDirection = $request->input('sort_direction', 'desc');
        
        // Verifica se a coluna de ordenação existe para evitar erros de SQL
        $allowedSorts = ['transaction_datetime', 'coins', 'id'];
        if(in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection);
        } else {
            $query->orderBy('transaction_datetime', 'desc');
        }

        $transactions = $query->paginate((int)$request->input('per_page', 20));

        return response()->json($transactions);
    }

    // Saldo (Já tinhas este)
    public function getBalance(Request $request){
        return response()->json(['data' => $request->user()->coins_balance]);
    }

    // --- NOVO: Criar Transação (O que faltava) ---
    public function store(Request $request)
    {
        $validated = $request->validate([
            'coin_transaction_type_id' => 'required|integer',
            'coins' => 'required|integer',
        ]);

        $user = $request->user();
        $amount = (int) $validated['coins'];

        // Verificar saldo se for débito
        if ($amount < 0 && $user->coins_balance < abs($amount)) {
            return response()->json(['message' => 'Saldo insuficiente'], 400);
        }

        // Atualizar Saldo
        $user->coins_balance += $amount;
        $user->save();

        // Criar Registo
        // Usamos o modelo diretamente para evitar erros se a relação no User não estiver definida
        $transaction = CoinTransaction::create([
            'user_id' => $user->id,
            'coin_transaction_type_id' => $validated['coin_transaction_type_id'],
            'coins' => $amount,
            'transaction_datetime' => now(),
            // 'game_id' => null, // Podes adicionar se enviares do Android
        ]);

        return response()->json($user); // Retorna o user atualizado
    }
}