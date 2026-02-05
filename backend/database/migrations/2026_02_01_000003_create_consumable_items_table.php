<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consumable_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->decimal('current_stock', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consumable_items');
    }
};
