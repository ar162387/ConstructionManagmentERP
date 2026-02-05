<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Vendor::class);

        $vendors = Vendor::query()->with('vendorInvoices')->orderBy('name')->get();
        $data = $vendors->map(fn (Vendor $v) => $this->formatVendorWithTotals($v));

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Vendor::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $vendor = Vendor::create($validated);
        $fresh = $vendor->fresh();

        AuditService::log(
            $request->user(),
            'create',
            'Vendor',
            (int) $fresh->id,
            null,
            $this->formatVendorWithTotals($fresh),
            'Vendor',
            "Created vendor: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatVendorWithTotals($fresh)], 201);
    }

    public function show(Request $request, Vendor $vendor): JsonResponse
    {
        $this->authorize('view', $vendor);

        return response()->json([
            'data' => $this->formatVendorWithTotals($vendor),
        ]);
    }

    public function update(Request $request, Vendor $vendor): JsonResponse
    {
        $this->authorize('update', $vendor);

        $beforeData = $this->formatVendorWithTotals($vendor);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $vendor->update($validated);
        $fresh = $vendor->fresh();

        AuditService::log(
            $request->user(),
            'update',
            'Vendor',
            (int) $fresh->id,
            $beforeData,
            $this->formatVendorWithTotals($fresh),
            'Vendor',
            "Updated vendor: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatVendorWithTotals($fresh)]);
    }

    public function destroy(Request $request, Vendor $vendor): JsonResponse
    {
        $this->authorize('delete', $vendor);

        if ($vendor->vendorInvoices()->exists()) {
            return response()->json([
                'message' => 'Cannot delete vendor that has invoices.',
                'errors' => ['vendor' => ['This vendor has one or more invoices. Delete or reassign them first.']],
            ], 422);
        }

        $beforeData = $this->formatVendorWithTotals($vendor);
        $name = $vendor->name;

        $vendor->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'Vendor',
            (int) $vendor->id,
            $beforeData,
            null,
            'Vendor',
            "Deleted vendor: {$name}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatVendor(Vendor $v, float $totalBilled, float $totalPaid): array
    {
        return [
            'id' => (string) $v->id,
            'name' => $v->name,
            'contactPerson' => $v->contact_person,
            'phone' => $v->phone,
            'email' => $v->email,
            'totalBilled' => round($totalBilled, 2),
            'totalPaid' => round($totalPaid, 2),
            'outstanding' => round($totalBilled - $totalPaid, 2),
            'createdAt' => $v->created_at->toISOString(),
        ];
    }

    private function formatVendorWithTotals(Vendor $v): array
    {
        $invoices = $v->relationLoaded('vendorInvoices') ? $v->vendorInvoices : $v->vendorInvoices()->get();
        $totalBilled = (float) $invoices->sum('total_amount');
        $totalPaid = (float) $invoices->sum('paid_amount');
        return $this->formatVendor($v, $totalBilled, $totalPaid);
    }
}
