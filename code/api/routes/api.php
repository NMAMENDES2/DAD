<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
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


    Route::post('/purchase', [PurchaseController::class, 'purchase']);

    Route::get('/transactions', [TransactionController::class, 'getTransactions']);
    Route::get('/balance', [TransactionController::class, 'getBalance']);
});

Route::apiResource('games', GameController::class);