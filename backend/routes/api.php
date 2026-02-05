<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConsumableItemController;
use App\Http\Controllers\Api\NonConsumableItemController;
use App\Http\Controllers\Api\NonConsumableMovementController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ReceivingEntryController;
use App\Http\Controllers\Api\StockConsumptionEntryController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\VendorInvoiceController;
use App\Http\Controllers\Api\VendorInvoicePaymentController;
use App\Http\Controllers\Api\ContractorController;
use App\Http\Controllers\Api\ContractorBillingEntryController;
use App\Http\Controllers\Api\ContractorPaymentController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('users', UserController::class);

    Route::apiResource('units', UnitController::class);
    Route::apiResource('vendors', VendorController::class);
    Route::apiResource('contractors', ContractorController::class);
    Route::post('contractors/{contractor}/payments', [ContractorPaymentController::class, 'store'])
        ->name('contractors.payments.store');
    Route::apiResource('contractor-billing-entries', ContractorBillingEntryController::class);
    Route::apiResource('consumable-items', ConsumableItemController::class);
    Route::apiResource('vendor-invoices', VendorInvoiceController::class);
    Route::post('vendor-invoices/{vendorInvoice}/payments', [VendorInvoicePaymentController::class, 'store'])
        ->name('vendor-invoices.payments.store');
    Route::apiResource('stock-consumption-entries', StockConsumptionEntryController::class);

    Route::apiResource('non-consumable-items', NonConsumableItemController::class);
    Route::apiResource('receiving-entries', ReceivingEntryController::class);
    Route::apiResource('non-consumable-movements', NonConsumableMovementController::class);

    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::get('/audit-logs/stats', [AuditLogController::class, 'stats']);
    Route::get('/audit-logs/filter-options', [AuditLogController::class, 'filterOptions']);
});
