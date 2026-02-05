<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsumableItem;
use App\Models\VendorInvoice;
use App\Models\VendorInvoiceLineItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorInvoiceController extends Controller
{
    /**
     * Generate next invoice number in format INV-YYYY-NNN (e.g. INV-2026-001).
     */
    public static function generateInvoiceNumber(): string
    {
        $year = (int) date('Y');
        $prefix = "INV-{$year}-";
        $last = VendorInvoice::query()
            ->where('invoice_number', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('invoice_number');

        $next = 1;
        if ($last !== null && preg_match('/^INV-\d+-(\d+)$/', $last, $m)) {
            $next = (int) $m[1] + 1;
        }

        return $prefix . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', VendorInvoice::class);

        $query = VendorInvoice::query()->with(['vendor', 'createdByUser']);

        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->input('vendor_id'));
        }

        $invoices = $query->orderByDesc('invoice_date')->orderByDesc('id')->get();

        return response()->json([
            'data' => $invoices->map(fn (VendorInvoice $inv) => $this->formatInvoice($inv)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', VendorInvoice::class);

        $validated = $request->validate([
            'vendor_id' => ['required', 'exists:vendors,id'],
            'vehicle_number' => ['nullable', 'string', 'max:100'],
            'bilty_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['required', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'line_items' => ['required', 'array', 'min:1'],
            'line_items.*.consumable_item_id' => ['required', 'exists:consumable_items,id'],
            'line_items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'line_items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($validated, $request) {
            $itemIds = array_unique(array_column($validated['line_items'], 'consumable_item_id'));
            ConsumableItem::whereIn('id', $itemIds)->lockForUpdate()->get();

            $totalAmount = 0;
            foreach ($validated['line_items'] as $line) {
                $lineTotal = (float) $line['quantity'] * (float) $line['unit_cost'];
                $totalAmount += $lineTotal;
            }

            $invoiceNumber = $validated['invoice_number'] ?? self::generateInvoiceNumber();

            $invoice = VendorInvoice::create([
                'vendor_id' => $validated['vendor_id'],
                'vehicle_number' => $validated['vehicle_number'] ?? null,
                'bilty_number' => $validated['bilty_number'] ?? null,
                'invoice_date' => $validated['invoice_date'],
                'invoice_number' => $invoiceNumber,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'remaining_amount' => $totalAmount,
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['line_items'] as $line) {
                $quantity = (float) $line['quantity'];
                $unitCost = (float) $line['unit_cost'];
                $lineTotal = $quantity * $unitCost;

                VendorInvoiceLineItem::create([
                    'vendor_invoice_id' => $invoice->id,
                    'consumable_item_id' => $line['consumable_item_id'],
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'line_total' => $lineTotal,
                ]);

                ConsumableItem::where('id', $line['consumable_item_id'])->increment('current_stock', $quantity);
            }

            return $invoice->fresh(['vendor', 'lineItems.consumableItem.unit', 'payments']);
        });

        AuditService::log(
            $request->user(),
            'create',
            'VendorInvoice',
            (int) $invoice->id,
            null,
            $this->formatInvoiceFull($invoice),
            'VendorInvoice',
            "Created vendor invoice {$invoice->invoice_number}",
            $request
        );

        return response()->json(['data' => $this->formatInvoiceFull($invoice)], 201);
    }

    public function show(Request $request, VendorInvoice $vendorInvoice): JsonResponse
    {
        $this->authorize('view', $vendorInvoice);

        $vendorInvoice->load([
            'vendor',
            'createdByUser',
            'lineItems.consumableItem.unit',
            'payments.createdByUser',
        ]);

        return response()->json([
            'data' => $this->formatInvoiceFull($vendorInvoice),
        ]);
    }

    public function update(Request $request, VendorInvoice $vendorInvoice): JsonResponse
    {
        $this->authorize('update', $vendorInvoice);

        $beforeData = $this->formatInvoiceFull($vendorInvoice->load(['vendor', 'lineItems.consumableItem.unit', 'payments']));

        $validated = $request->validate([
            'vehicle_number' => ['nullable', 'string', 'max:100'],
            'bilty_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['sometimes', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'line_items' => ['sometimes', 'array', 'min:1'],
            'line_items.*.consumable_item_id' => ['required_with:line_items', 'exists:consumable_items,id'],
            'line_items.*.quantity' => ['required_with:line_items', 'numeric', 'min:0.01'],
            'line_items.*.unit_cost' => ['required_with:line_items', 'numeric', 'min:0'],
        ]);

        try {
            $fresh = DB::transaction(function () use ($vendorInvoice, $validated, $request) {
                $meta = array_filter($validated, fn ($k) => in_array($k, ['vehicle_number', 'bilty_number', 'invoice_date', 'invoice_number'], true), ARRAY_FILTER_USE_KEY);
                if (count($meta) > 0) {
                    $vendorInvoice->update($meta);
                }

                if (isset($validated['line_items'])) {
                    $oldLineItems = $vendorInvoice->lineItems()->with('consumableItem')->get();
                    $oldByItem = [];
                    foreach ($oldLineItems as $line) {
                        $cid = $line->consumable_item_id;
                        $oldByItem[$cid] = ($oldByItem[$cid] ?? 0) + (float) $line->quantity;
                    }

                    $newByItem = [];
                    foreach ($validated['line_items'] as $line) {
                        $cid = $line['consumable_item_id'];
                        $newByItem[$cid] = ($newByItem[$cid] ?? 0) + (float) $line['quantity'];
                    }

                    $allItemIds = array_unique(array_merge(array_keys($oldByItem), array_keys($newByItem)));
                    if (count($allItemIds) > 0) {
                        $items = ConsumableItem::whereIn('id', $allItemIds)->lockForUpdate()->get()->keyBy('id');

                        foreach ($allItemIds as $consumableItemId) {
                            $oldTotal = $oldByItem[$consumableItemId] ?? 0;
                            $newTotal = $newByItem[$consumableItemId] ?? 0;
                            $difference = $newTotal - $oldTotal;

                            if ($difference < 0) {
                                $item = $items->get($consumableItemId);
                                if ($item) {
                                    $current = (float) $item->current_stock;
                                    if ($current + $difference < 0) {
                                        throw new \InvalidArgumentException(
                                            "Cannot update invoice: reducing quantity for \"{$item->name}\" would make inventory negative. Current stock: {$current}, reduction: " . abs($difference) . '.'
                                        );
                                    }
                                }
                            }
                        }

                        foreach ($allItemIds as $consumableItemId) {
                            $oldTotal = $oldByItem[$consumableItemId] ?? 0;
                            $newTotal = $newByItem[$consumableItemId] ?? 0;
                            $difference = $newTotal - $oldTotal;
                            if ($difference !== 0.0) {
                                if ($difference > 0) {
                                    ConsumableItem::where('id', $consumableItemId)->increment('current_stock', $difference);
                                } else {
                                    ConsumableItem::where('id', $consumableItemId)->decrement('current_stock', abs($difference));
                                }
                            }
                        }
                    }

                    $vendorInvoice->lineItems()->delete();

                    $totalAmount = 0;
                    foreach ($validated['line_items'] as $line) {
                        $quantity = (float) $line['quantity'];
                        $unitCost = (float) $line['unit_cost'];
                        $lineTotal = $quantity * $unitCost;
                        $totalAmount += $lineTotal;

                        VendorInvoiceLineItem::create([
                            'vendor_invoice_id' => $vendorInvoice->id,
                            'consumable_item_id' => $line['consumable_item_id'],
                            'quantity' => $quantity,
                            'unit_cost' => $unitCost,
                            'line_total' => $lineTotal,
                        ]);
                    }

                    $paidAmount = (float) $vendorInvoice->paid_amount;
                    $remainingAmount = max(0, $totalAmount - $paidAmount);
                    $vendorInvoice->update([
                        'total_amount' => $totalAmount,
                        'remaining_amount' => $remainingAmount,
                    ]);
                }

                return $vendorInvoice->fresh(['vendor', 'lineItems.consumableItem.unit', 'payments']);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $afterData = $this->formatInvoiceFull($fresh);
        [$beforeChanged, $afterChanged] = AuditService::diffChangedOnly($beforeData, $afterData);

        AuditService::log(
            $request->user(),
            'update',
            'VendorInvoice',
            (int) $fresh->id,
            $beforeChanged,
            $afterChanged,
            'VendorInvoice',
            "Updated vendor invoice {$fresh->invoice_number}",
            $request
        );

        return response()->json(['data' => $this->formatInvoiceFull($fresh)]);
    }

    public function destroy(Request $request, VendorInvoice $vendorInvoice): JsonResponse
    {
        $this->authorize('delete', $vendorInvoice);

        $vendorInvoice->load(['vendor', 'lineItems.consumableItem.unit', 'payments']);
        $id = $vendorInvoice->id;
        $invoiceNumber = $vendorInvoice->invoice_number;
        $deleteItems = $this->formatInvoiceDeleteItems($vendorInvoice);

        $deleteData = [
            'invoiceNumber' => $invoiceNumber,
            'totalAmount' => (float) $vendorInvoice->total_amount,
            'vendorName' => $vendorInvoice->vendor?->name ?? null,
            'items' => $deleteItems,
        ];

        try {
            DB::transaction(function () use ($vendorInvoice) {
                $lineItems = $vendorInvoice->lineItems()->with('consumableItem')->get();
                $itemIds = $lineItems->pluck('consumable_item_id')->unique()->filter()->values()->all();

                if (count($itemIds) > 0) {
                    $items = ConsumableItem::whereIn('id', $itemIds)->lockForUpdate()->get()->keyBy('id');

                    $qtyByItem = [];
                    foreach ($lineItems as $line) {
                        $cid = $line->consumable_item_id;
                        $qtyByItem[$cid] = ($qtyByItem[$cid] ?? 0) + (float) $line->quantity;
                    }

                    foreach ($qtyByItem as $consumableItemId => $quantity) {
                        $item = $items->get($consumableItemId);
                        if (! $item) {
                            continue;
                        }
                        $current = (float) $item->current_stock;
                        if ($current - $quantity < 0) {
                            throw new \InvalidArgumentException(
                                "Cannot delete invoice: stock for \"{$item->name}\" is insufficient to revert. Current: {$current}, to revert: {$quantity}."
                            );
                        }
                    }

                    foreach ($lineItems as $line) {
                        ConsumableItem::where('id', $line->consumable_item_id)->decrement('current_stock', (float) $line->quantity);
                    }
                }

                $vendorInvoice->delete();
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        AuditService::log(
            $request->user(),
            'delete',
            'VendorInvoice',
            (int) $id,
            $deleteData,
            null,
            'VendorInvoice',
            "Deleted vendor invoice {$invoiceNumber}",
            $request
        );

        return response()->json(null, 204);
    }

    /** @return array<int, array{name: string, unit: string, quantity: float}> */
    private function formatInvoiceDeleteItems(VendorInvoice $inv): array
    {
        $items = [];
        foreach ($inv->lineItems as $line) {
            $name = $line->consumableItem?->name ?? 'Unknown';
            $unit = $line->consumableItem?->unit?->symbol ?? $line->consumableItem?->unit?->name ?? '-';
            $items[] = [
                'name' => $name,
                'unit' => $unit,
                'quantity' => (float) $line->quantity,
            ];
        }
        return $items;
    }

    private function formatInvoice(VendorInvoice $inv): array
    {
        return [
            'id' => (string) $inv->id,
            'vendorId' => (string) $inv->vendor_id,
            'vendor' => $inv->relationLoaded('vendor') ? [
                'id' => (string) $inv->vendor->id,
                'name' => $inv->vendor->name,
            ] : null,
            'vehicleNumber' => $inv->vehicle_number,
            'biltyNumber' => $inv->bilty_number,
            'invoiceDate' => $inv->invoice_date->format('Y-m-d'),
            'invoiceNumber' => $inv->invoice_number,
            'totalAmount' => (float) $inv->total_amount,
            'paidAmount' => (float) $inv->paid_amount,
            'remainingAmount' => (float) $inv->remaining_amount,
            'createdBy' => $inv->relationLoaded('createdByUser') && $inv->createdByUser
                ? ['id' => (string) $inv->createdByUser->id, 'name' => $inv->createdByUser->name]
                : null,
            'createdAt' => $inv->created_at->toISOString(),
        ];
    }

    private function formatInvoiceFull(VendorInvoice $inv): array
    {
        $data = $this->formatInvoice($inv);
        $data['lineItems'] = $inv->relationLoaded('lineItems')
            ? $inv->lineItems->map(function ($line) {
                $item = [
                    'id' => (string) $line->id,
                    'consumableItemId' => (string) $line->consumable_item_id,
                    'quantity' => (float) $line->quantity,
                    'unitCost' => (float) $line->unit_cost,
                    'lineTotal' => (float) $line->line_total,
                ];
                if ($line->relationLoaded('consumableItem')) {
                    $item['consumableItem'] = [
                        'id' => (string) $line->consumableItem->id,
                        'name' => $line->consumableItem->name,
                        'unit' => $line->consumableItem->relationLoaded('unit') && $line->consumableItem->unit
                            ? ['id' => (string) $line->consumableItem->unit->id, 'name' => $line->consumableItem->unit->name, 'symbol' => $line->consumableItem->unit->symbol]
                            : null,
                    ];
                }
                return $item;
            })->values()->all()
            : [];
        $data['payments'] = $inv->relationLoaded('payments')
            ? $inv->payments->map(fn ($p) => [
                'id' => (string) $p->id,
                'amount' => (float) $p->amount,
                'date' => $p->date->format('Y-m-d'),
                'paymentMode' => $p->payment_mode,
                'reference' => $p->reference,
                'createdBy' => $p->relationLoaded('createdByUser') && $p->createdByUser
                    ? ['id' => (string) $p->createdByUser->id, 'name' => $p->createdByUser->name]
                    : null,
                'createdAt' => $p->created_at->toISOString(),
            ])->values()->all()
            : [];
        return $data;
    }
}
