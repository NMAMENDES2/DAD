<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function getTransactions(Request $request)
    {
        $user = $request->user();

        $query = $user->coinTransactions()->with('type');

        if ($request->filled('type')) {
            $query->whereHas('type', function ($q) use ($request) {
                $q->where('name', $request->type);
            });
            error_log($request->input('type')); // daqui vem 1
        }

        $sortBy = $request->input('sort_by', 'began_at');  
        $sortDirection = $request->input('sort_direction', 'desc');

        $query->orderBy($sortBy, $sortDirection);

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 20);

        $transactions = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function getBalance(Request $request){

        $user = $request->user();
        $balance = $user->coins_balance;

        return response()->json([
            'data' => $balance,
        ]);
    }
}

