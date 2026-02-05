<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receiving_entry_line_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receiving_entry_id')->constrained('receiving_entries')->cascadeOnDelete();
            $table->foreignId('non_consumable_item_id')->constrained('non_consumable_items')->cascadeOnDelete();
            $table->decimal('quantity', 15, 2);
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('line_total', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receiving_entry_line_items');
    }
};
