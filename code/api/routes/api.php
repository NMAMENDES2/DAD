<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\MatchController; // <--- NOVO CONTROLADOR
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    
    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });
    
    Route::post('logout', [AuthController::class, 'logout']);

    // Economia
    Route::post('/purchase', [PurchaseController::class, 'purchase']);
    Route::get('/transactions', [TransactionController::class, 'getTransactions']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/balance', [TransactionController::class, 'getBalance']);

    // Leaderboard
    Route::get('/leaderboard', [LeaderboardController::class, 'getLeaderboard']);

    // Jogos (Mãos Individuais - Opcional se quiseres gravar cada mão)
    Route::apiResource('games', GameController::class);

    // --- PARTIDAS (MATCHES - O Principal) ---
    Route::get('/matches', [MatchController::class, 'index']);
    Route::post('/matches', [MatchController::class, 'store']);
});