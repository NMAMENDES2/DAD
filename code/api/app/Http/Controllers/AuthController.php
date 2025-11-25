<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\CoinTransaction;
use App\Models\CoinTransactionType;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Testing\Fluent\Concerns\Has;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function register(RegisterRequest $request)
    {
        error_log('Register method reached');
        error_log('Request Data: ' . print_r($request->all(), true));

        $user = User::create([
            'name' => $request->name,
            'nickname' => $request->nickname,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'type' => 'P',
            'blocked' => false,
            'photo_avatar_filname' => null,
            'coins_balance' => 10,
            'custom' => null,
        ]);

        CoinTransaction::create([
            'transaction_datetime' => now(),
            'user_id' => $user->id,
            'coin_transaction_type_id' => 1,
            'match_id' => null,
            'game_id' => null,
            'coins' => 10,
            'custom' => null,
        ]);

        return response()->json([
            'user' => $user,
            'message' => 'Registered successfully'
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }
}
