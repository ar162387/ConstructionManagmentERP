<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contractor;
use App\Models\ContractorPayment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContractorPaymentController extends Controller
{
    public function store(Request $request, Contractor $contractor): JsonResponse
    {
        $this->authorize('view', $contractor);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'payment_mode' => ['nullable', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $payment = ContractorPayment::create([
            'contractor_id' => $contractor->id,
            'amount' => $validated['amount'],
            'payment_date' => $validated['payment_date'],
            'payment_mode' => $validated['payment_mode'] ?? null,
            'reference' => $validated['reference'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $fresh = $payment->fresh(['contractor', 'createdByUser']);

        AuditService::log(
            $request->user(),
            'create',
            'ContractorPayment',
            (int) $fresh->id,
            null,
            [
                'id' => (string) $fresh->id,
                'contractorId' => (string) $contractor->id,
                'contractorName' => $contractor->name,
                'amount' => (float) $fresh->amount,
                'paymentDate' => $fresh->payment_date->format('Y-m-d'),
                'paymentMode' => $fresh->payment_mode ?? null,
                'reference' => $fresh->reference ?? null,
            ],
            'ContractorPayment',
            "Recorded payment of {$fresh->amount} for contractor {$contractor->name}",
            $request
        );

        return response()->json([
            'data' => [
                'id' => (string) $fresh->id,
                'contractorId' => (string) $fresh->contractor_id,
                'amount' => (float) $fresh->amount,
                'paymentDate' => $fresh->payment_date->format('Y-m-d'),
                'paymentMode' => $fresh->payment_mode ?? null,
                'reference' => $fresh->reference ?? null,
                'createdBy' => $fresh->createdByUser
                    ? ['id' => (string) $fresh->createdByUser->id, 'name' => $fresh->createdByUser->name]
                    : null,
                'createdAt' => $fresh->created_at->toISOString(),
            ],
        ], 201);
    }
}
