<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\MatchController; 
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\StatisticsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminUserController;


Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/games/my', [GameController::class, 'myGames']); // fora do grupo

Route::middleware('auth:sanctum')->group(function () {
    
    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });
    
    Route::post('logout', [AuthController::class, 'logout']);

    // Profile

    Route::put('/profile/name', [ProfileController::class, 'updateName']);
    Route::put('/profile/email', [ProfileController::class, 'updateEmail']);
    Route::put('/profile/nickname', [ProfileController::class, 'updateNickname']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('profile/avatar', [ProfileController::class, 'updateAvatar']);
    Route::delete('/profile', [ProfileController::class, 'destroy']);

    // Economia
    Route::post('/purchase', [PurchaseController::class, 'purchase']);
    Route::get('/transactions', [TransactionController::class, 'getTransactions']);
    Route::post('/transactions', [TransactionController::class, 'store']);

    // Leaderboard
    Route::get('/leaderboard', [LeaderboardController::class, 'getLeaderboard']);
    Route::get('/games/me', [GameController::class, 'myGames']);

    Route::apiResource('games', GameController::class);


    Route::post('/multiplayer/games', [MatchController::class, 'storeGame']);
    Route::get('/matches', [MatchController::class, 'myMatches']);
    Route::post('/matches', [MatchController::class, 'store']);
    Route::get('/matches/me', [MatchController::class, 'myMatches']);
    Route::get('/matches/{match}', [MatchController::class, 'show']);

    Route::get('/shop/items', [App\Http\Controllers\ShopController::class, 'index']);
    Route::post('/shop/buy', [App\Http\Controllers\ShopController::class, 'buy']);
    Route::post('/shop/equip', [App\Http\Controllers\ShopController::class, 'equip']);


    Route::get('/statistics/me', [StatisticsController::class, 'getMyStats']);

    Route::get('/statistics/global', [StatisticsController::class, 'getGlobalStats']);

    // Admin Routes
    Route::middleware(['is_admin'])->prefix('admin')->group(function () {
        // Users admin
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'storeAdmin']);
        Route::patch('/users/{user}/block', [AdminUserController::class, 'block']);
        Route::patch('/users/{user}/unblock', [AdminUserController::class, 'unblock']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        // Read-only data for admins
        Route::get('/transactions', [TransactionController::class, 'getTransactions']);
        Route::get('/games', [GameController::class, 'index']);
        Route::get('/matches', [MatchController::class, 'index']);
        Route::get('/statistics/global', [StatisticsController::class, 'getGlobalStats']);
    });
});