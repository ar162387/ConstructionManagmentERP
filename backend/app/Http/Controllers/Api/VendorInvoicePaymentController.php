<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VendorInvoice;
use App\Models\VendorInvoicePayment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorInvoicePaymentController extends Controller
{
    public function store(Request $request, VendorInvoice $vendorInvoice): JsonResponse
    {
        $this->authorize('view', $vendorInvoice);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'payment_mode' => ['nullable', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $amount = (float) $validated['amount'];
        $remaining = (float) $vendorInvoice->remaining_amount;

        if ($amount > $remaining) {
            return response()->json([
                'message' => 'Payment amount cannot exceed remaining amount.',
                'errors' => ['amount' => ['Amount must be at most ' . $remaining . '.']],
            ], 422);
        }

        $payment = DB::transaction(function () use ($vendorInvoice, $validated, $request, $amount) {
            $payment = VendorInvoicePayment::create([
                'vendor_invoice_id' => $vendorInvoice->id,
                'amount' => $amount,
                'date' => $validated['date'],
                'payment_mode' => $validated['payment_mode'] ?? null,
                'reference' => $validated['reference'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $newPaid = (float) $vendorInvoice->paid_amount + $amount;
            $newRemaining = (float) $vendorInvoice->remaining_amount - $amount;

            $vendorInvoice->update([
                'paid_amount' => $newPaid,
                'remaining_amount' => $newRemaining,
            ]);

            return $payment->fresh(['createdByUser']);
        });

        $invoice = $vendorInvoice->fresh();

        AuditService::log(
            $request->user(),
            'create',
            'VendorInvoicePayment',
            (int) $payment->id,
            null,
            [
                'id' => (string) $payment->id,
                'vendorInvoiceId' => (string) $vendorInvoice->id,
                'invoiceNumber' => $vendorInvoice->invoice_number,
                'amount' => (float) $payment->amount,
                'date' => $payment->date->format('Y-m-d'),
                'paymentMode' => $payment->payment_mode ?? null,
                'remainingBalance' => (float) $invoice->remaining_amount,
            ],
            'VendorInvoicePayment',
            "Recorded payment of {$amount} for invoice {$vendorInvoice->invoice_number}",
            $request
        );

        return response()->json([
            'data' => [
                'payment' => [
                    'id' => (string) $payment->id,
                    'vendorInvoiceId' => (string) $payment->vendor_invoice_id,
                    'amount' => (float) $payment->amount,
                    'date' => $payment->date->format('Y-m-d'),
                    'paymentMode' => $payment->payment_mode,
                    'reference' => $payment->reference,
                    'createdBy' => $payment->createdByUser
                        ? ['id' => (string) $payment->createdByUser->id, 'name' => $payment->createdByUser->name]
                        : null,
                    'createdAt' => $payment->created_at->toISOString(),
                ],
                'invoice' => [
                    'id' => (string) $invoice->id,
                    'paidAmount' => (float) $invoice->paid_amount,
                    'remainingAmount' => (float) $invoice->remaining_amount,
                ],
            ],
        ], 201);
    }
}
