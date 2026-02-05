<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_invoice_id')->constrained('vendor_invoices')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->string('payment_mode')->nullable();
            $table->string('reference')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_invoice_payments');
    }
};
