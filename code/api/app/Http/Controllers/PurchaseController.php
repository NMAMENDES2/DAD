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

    public function purchaseAvatar(Request $request){

        $user = $request->user();

        return response()->json([
            'message' => 'Not implemented yet',
        ], 501);

    }

    public function purchase(PurchaseRequest $request){

        $validated = $request->validated();

        $user = $request->user();

        $type = $validated['type'];
        $reference = $validated['reference'];
        $value = $validated['value'];

        if($error = $this->isInvalidReference($type, $reference, $value)) {
            return response()->json([
                'message' => $error,
            ], 422);
        }

        error_log($type);
        error_log($reference);
        error_log($value);

        if($value)

        try{

            $response = Http::withoutVerifying()->post('https://dad-payments-api.vercel.app/api/debit', [
                'type' => $type,
                'reference' => $reference,
                'value' => $value
            ]);

            error_log($response->status());

            if($response->status() !== 201){
                return response()->json([
                    'message' => 'Payment failed. Please check the details and try again',
                    'details' => $response->json(),
                ], 422);
            }

            $coins = $value*10;

            $user->coins_balance += $coins;
            $user->save();

            $coinTransaction = CoinTransaction::create([
                'transaction_datetime' => now(),
                'user_id' => $user->id,
                'coin_transaction_type_id' => 2,
                'match_id' => null,
                'game_id' => null,
                'coins' => $coins,
                'custom' => null
            ]);

            CoinPurchase::create([
                'purchase_datetime' => now(),
                'user_id' => $user->id,
                'coin_transaction_id' => $coinTransaction->id,
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
                'message' => 'An unexpected error occurred during the purchase process.',
                'details' => $e->getMessage(),
            ]);
        }
    }

    private function isInvalidReference($type, $reference, $value){
    $error = null;

    switch ($type) {
        case 'MBWAY':
            if (substr($reference, 0, 2) == '90') {
                $error = 'Invalid MBWAY phone number. Phone numbers starting with "90" are not allowed.';
                break; 
            }
           
            if ($value > 5) {
                $error = 'MBWAY transactions cannot exceed €5.';
                break;
            }
            break;

        case 'PAYPAL':
           
            if (substr($reference, 0, 2) == 'xx') {
                $error = 'Invalid PayPal email address. Emails starting with "xx" are not allowed.';
                break;
            }
            
            if ($value > 10) {
                $error = 'PayPal transactions cannot exceed €10.';
                break;
            }
            break;

        case 'IBAN':
           
            if (substr($reference, 0, 2) == 'XX') {
                $error = 'Invalid IBAN format. IBANs starting with "XX" are not allowed.';
                break;
            }

            if ($value > 50) {
                $error = 'IBAN transactions cannot exceed €50.';
                break;
            }
            break;

        case 'MB':
           
            if (substr($reference, 0, 1) == '9') {
                $error = 'Invalid MB entity number. Entity numbers starting with "9" are not allowed.';
                break;
            }

            if ($value > 20) {
                $error = 'MB transactions cannot exceed €20.';
                break;
            }
            break;

        case 'VISA':
          
            if (substr($reference, 0, 2) == '40') {
                $error = 'Invalid VISA card reference. Card numbers starting with "40" are not allowed.';
                break;
            }
          
            if ($value > 30) {
                $error = 'VISA transactions cannot exceed €30.';
                break;
            }
            break;

        default:
            return false; 
    }

    if ($error) {
        return $error;
    }

    return false; 
}

}
