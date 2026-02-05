<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_consumption_line_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_consumption_entry_id')->constrained('stock_consumption_entries')->cascadeOnDelete();
            $table->foreignId('consumable_item_id')->constrained('consumable_items')->cascadeOnDelete();
            $table->decimal('quantity', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_consumption_line_items');
    }
};
