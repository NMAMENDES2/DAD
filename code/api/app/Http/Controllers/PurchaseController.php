<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest;
use App\Models\CoinPurchase;
use App\Models\CoinTransaction;
use App\Models\CoinTransactionType;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

use function PHPSTORM_META\type;

class PurchaseController extends Controller
{
    public function purchase(PurchaseRequest $request){

        $validated = $request->validated();

        $user = $request->user();

        $type = $validated['type'];
        $reference = $validated['reference'];
        $value = $validated['value'];

        error_log($type);
        error_log($reference);
        error_log($value);

        try{

            $response = Http::post('https://dad-payments-api.vercel.app/api/debit', [
                'type' => $type,
                'reference' => $reference,
                'value' => $value
            ]);

            error_log($response->status());

            if($response->status() !== 201){
                return response()->json([
                    'error' => 'Payment failed. Please check the details and try again',
                    'details' => $response->json(),
                ], 422);
            }

            $coins = $value*10;

            $user->coins_balance += $coins;
            $user->save();

            $coinTransaction = CoinTransaction::create([
                'transaction_datetime' => now()->format('Y-m-d H:i:s'),
                'user_id' => $user->id,
                'coin_transaction_type_id' => 2,
                'match_id' => null,
                'game_id' => null,
                'coins' => $coins,
                'custom' => null
            ]);

            CoinPurchase::create([
                'transaction_datetime' => now()->format('Y-m-d H:i:s'),
                'user_id' => $user->id,
                'coin_transaction_id' => $coinTransaction,
                'euros' => $value,
                'payment_type' => $type,
                'payment_reference' => $reference,
                'custom' => null,
            ]);

            return response()->json([
                'message' => 'Purchase successfull',
                'balance' => $user->coins_balance,
            ]);

        }catch(Exception $e){
            return response()->json([
                'error' => 'An unexpected error occurred during the purchase process.'
            ]);
        }
    }
}
