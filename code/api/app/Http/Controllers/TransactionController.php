<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CoinTransaction;

class TransactionController extends Controller
{
    /**
     * Impede administradores de mexerem em coins (criar transações).
     */
    private function ensureNotAdmin(Request $request)
    {
        $user = $request->user();

        if ($user && $user->type === 'A') {
            return response()->json([
                'message' => 'Administrators cannot play games or hold coins.',
            ], 403);
        }

        return null;
    }

    
    public function getTransactions(Request $request)
    {
        $user = $request->user();

        // base query
        $query = CoinTransaction::query()
            ->with(relations: ['user', 'type', 'game', 'match']); 

        // se NÃO for rota admin, mostra só as transações do próprio
        if (!$request->is('api/admin/*')) {
            $query->where('user_id', $user->id);
        }

        // filtros extra apenas úteis para admin
        if ($request->is('api/admin/*')) {

            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }
        }

        // filtro por tipo (nome do tipo)
        if ($request->filled('type')) {
            $query->whereHas('type', function ($q) use ($request) {
                $q->where('name', $request->input('type'));
            });
        }

        if ($request->filled('from')) {
            $query->where('transaction_datetime', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->where('transaction_datetime', '<=', $request->input('to'));
        }

        // ordenação segura
        $sortBy        = $request->input('sort_by', 'transaction_datetime');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts  = ['transaction_datetime', 'coins', 'id'];

        if (!in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'transaction_datetime';
        }

        $transactions = $query
            ->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc')
            ->paginate((int) $request->input('per_page', 20));

        return response()->json($transactions);
    }

    /**
     * Criar uma transação de coins (não para admins).
     */
    public function store(Request $request)
    {
        if ($resp = $this->ensureNotAdmin($request)) {
            return $resp;
        }

        $validated = $request->validate([
            'coin_transaction_type_id' => 'required|integer',
            'coins'                    => 'required|integer',
        ]);

        $user   = $request->user();
        $amount = (int) $validated['coins'];

        // Verificar saldo se for débito
        if ($amount < 0 && $user->coins_balance < abs($amount)) {
            return response()->json(['message' => 'Saldo insuficiente'], 400);
        }

        // Atualizar saldo
        $user->coins_balance += $amount;
        $user->save();

        // Criar registo
        $transaction = CoinTransaction::create([
            'user_id'                   => $user->id,
            'coin_transaction_type_id'  => $validated['coin_transaction_type_id'],
            'coins'                     => $amount,
            'transaction_datetime'      => now(),
        ]);

        return response()->json([
            'user'        => $user,
            'transaction' => $transaction,
        ]);
    }
}
