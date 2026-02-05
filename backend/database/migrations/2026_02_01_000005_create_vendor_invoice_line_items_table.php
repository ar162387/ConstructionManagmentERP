<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_invoice_line_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_invoice_id')->constrained('vendor_invoices')->cascadeOnDelete();
            $table->foreignId('consumable_item_id')->constrained('consumable_items')->cascadeOnDelete();
            $table->decimal('quantity', 15, 2);
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('line_total', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_invoice_line_items');
    }
};
