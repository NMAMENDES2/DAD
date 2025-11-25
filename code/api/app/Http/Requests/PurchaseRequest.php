<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
   public function rules(): array
    {
        return [
            'type' => 'required|in:MBWAY,PAYPAL,IBAN,MB,VISA',
            'reference' => [
                'required',
                function ($attribute, $value, $fail) {
                    $type = $this->input('type');
                    
                    switch ($type) {
                        case 'MBWAY':
                            if (!preg_match('/^9\d{8}$/', $value)) {
                                $fail('MBWAY reference must be 9 digits starting with 9.');
                            }
                            break;
                        case 'PAYPAL':
                            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                                $fail('PAYPAL reference must be a valid email address.');
                            }
                            break;
                        case 'IBAN':
                            if (!preg_match('/^[A-Z]{2}\d{23}$/', $value)) {
                                $fail('IBAN reference must follow the format "XX12345678901234567890123".');
                            }
                            break;
                        case 'MB':
                            if (!preg_match('/^\d{5}-\d{9}$/', $value)) {
                                $fail('MB reference must follow the format "12345-123456789".');
                            }
                            break;
                        case 'VISA':
                            if (!preg_match('/^4\d{15}$/', $value)) {
                                $fail('VISA reference must be 16 digits starting with 4.');
                            }
                            break;
                        default:
                            $fail('Invalid payment type.');
                    }
                },
            ],
            'value' => 'required|integer|min:1|max:99',
        ];
    }

     public function messages(): array
    {
        return [
            'type.required' => 'Payment type is required.',
            'type.in' => 'Payment type must be one of the following: MBWAY, PAYPAL, IBAN, MB, VISA.',
            'reference.required' => 'Payment reference is required.',
            'value.required' => 'Payment value is required.',
            'value.integer' => 'Payment value must be a positive integer.',
            'value.min' => 'Payment value must be at least 1.',
            'value.max' => 'Payment value must not exceed 99.',
        ];
    }
}
