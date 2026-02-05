<?php

namespace Tests\Feature;

use App\Models\ConsumableItem;
use App\Models\Project;
use App\Models\StockConsumptionEntry;
use App\Models\StockConsumptionLineItem;
use App\Models\Unit;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorInvoice;
use App\Models\VendorInvoiceLineItem;
use App\Models\VendorInvoicePayment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VendorInventoryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'role' => 'super_admin',
            'can_edit' => true,
            'can_delete' => true,
        ]);
    }

    private function actingAsSuperAdmin(): self
    {
        Sanctum::actingAs($this->user);

        return $this;
    }

    /** @test */
    public function units_index_returns_200_and_data(): void
    {
        Unit::factory()->count(3)->create();
        $response = $this->actingAsSuperAdmin()->getJson('/api/units');
        $response->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name', 'symbol']]]);
        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function unit_store_creates_and_returns_201(): void
    {
        $response = $this->actingAsSuperAdmin()->postJson('/api/units', [
            'name' => 'Cubic Meter',
            'symbol' => 'm³',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.name', 'Cubic Meter');
        $this->assertDatabaseHas('units', ['name' => 'Cubic Meter']);
    }

    /** @test */
    public function unit_update_and_destroy_work(): void
    {
        $unit = Unit::factory()->create(['name' => 'Old']);
        $this->actingAsSuperAdmin()->putJson("/api/units/{$unit->id}", ['name' => 'New'])
            ->assertStatus(200);
        $this->assertDatabaseHas('units', ['id' => $unit->id, 'name' => 'New']);
        $this->actingAsSuperAdmin()->deleteJson("/api/units/{$unit->id}")->assertStatus(204);
        $this->assertDatabaseMissing('units', ['id' => $unit->id]);
    }

    /** @test */
    public function vendors_index_returns_200_with_totals(): void
    {
        Vendor::factory()->count(2)->create();
        $response = $this->actingAsSuperAdmin()->getJson('/api/vendors');
        $response->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name', 'totalBilled', 'totalPaid', 'outstanding']]]);
    }

    /** @test */
    public function vendor_store_and_delete_with_invoices_fails_422(): void
    {
        $vendor = Vendor::factory()->create();
        $response = $this->actingAsSuperAdmin()->postJson('/api/vendors', [
            'name' => 'New Vendor',
            'contactPerson' => 'John',
            'phone' => '+123',
            'email' => 'v@test.com',
        ]);
        $response->assertStatus(201);

        $vendorWithInvoices = Vendor::factory()->create();
        VendorInvoice::factory()->create(['vendor_id' => $vendorWithInvoices->id]);
        $del = $this->actingAsSuperAdmin()->deleteJson("/api/vendors/{$vendorWithInvoices->id}");
        $del->assertStatus(422)->assertJsonPath('message', 'Cannot delete vendor that has invoices.');
    }

    /** @test */
    public function consumable_items_index_returns_200_with_unit(): void
    {
        $unit = Unit::factory()->create();
        ConsumableItem::factory()->count(2)->create(['unit_id' => $unit->id]);
        $response = $this->actingAsSuperAdmin()->getJson('/api/consumable-items');
        $response->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name', 'unitId', 'currentStock', 'unit']]]);
    }

    /** @test */
    public function consumable_delete_when_used_in_invoice_fails_422(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id]);
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create(['vendor_id' => $vendor->id]);
        VendorInvoiceLineItem::factory()->create([
            'vendor_invoice_id' => $inv->id,
            'consumable_item_id' => $item->id,
            'quantity' => 10,
            'unit_cost' => 5,
            'line_total' => 50,
        ]);
        $response = $this->actingAsSuperAdmin()->deleteJson("/api/consumable-items/{$item->id}");
        $response->assertStatus(422)->assertJsonFragment(['message' => 'Cannot delete consumable item that is used in vendor invoices.']);
    }

    /** @test */
    public function consumable_delete_when_used_in_stock_consumption_fails_422(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 100]);
        $project = Project::factory()->create();
        $entry = StockConsumptionEntry::factory()->create(['project_id' => $project->id]);
        $entry->lineItems()->create([
            'consumable_item_id' => $item->id,
            'quantity' => 10,
        ]);
        $response = $this->actingAsSuperAdmin()->deleteJson("/api/consumable-items/{$item->id}");
        $response->assertStatus(422)->assertJsonFragment(['message' => 'Cannot delete consumable item that is used in stock consumption.']);
    }

    /** @test */
    public function vendor_invoice_store_adds_stock_and_returns_201(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 0]);
        $vendor = Vendor::factory()->create();
        $response = $this->actingAsSuperAdmin()->postJson('/api/vendor-invoices', [
            'vendor_id' => $vendor->id,
            'vehicle_number' => 'TRK-001',
            'bilty_number' => 'BLT-001',
            'invoice_date' => now()->format('Y-m-d'),
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 50, 'unit_cost' => 10],
            ],
        ]);
        $response->assertStatus(201);
        $this->assertEqualsWithDelta(500, $response->json('data.totalAmount'), 0.01);
        $item->refresh();
        $this->assertSame(50.0, (float) $item->current_stock);
        $this->assertMatchesRegularExpression('/^INV-\d{4}-\d{3}$/', $response->json('data.invoiceNumber'));
    }

    /** @test */
    public function vendor_invoice_show_returns_line_items_and_payments(): void
    {
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create(['vendor_id' => $vendor->id]);
        $response = $this->actingAsSuperAdmin()->getJson("/api/vendor-invoices/{$inv->id}");
        $response->assertStatus(200)->assertJsonStructure(['data' => ['lineItems', 'payments']]);
    }

    /** @test */
    public function payment_exceeding_remaining_returns_422(): void
    {
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create([
            'vendor_id' => $vendor->id,
            'total_amount' => 100,
            'paid_amount' => 0,
            'remaining_amount' => 100,
        ]);
        $response = $this->actingAsSuperAdmin()->postJson("/api/vendor-invoices/{$inv->id}/payments", [
            'amount' => 150,
            'date' => now()->format('Y-m-d'),
            'payment_mode' => 'bank_transfer',
        ]);
        $response->assertStatus(422)->assertJsonFragment(['message' => 'Payment amount cannot exceed remaining amount.']);
    }

    /** @test */
    public function payment_valid_updates_invoice_paid_and_remaining(): void
    {
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create([
            'vendor_id' => $vendor->id,
            'total_amount' => 100,
            'paid_amount' => 0,
            'remaining_amount' => 100,
        ]);
        $response = $this->actingAsSuperAdmin()->postJson("/api/vendor-invoices/{$inv->id}/payments", [
            'amount' => 40,
            'date' => now()->format('Y-m-d'),
            'payment_mode' => 'bank_transfer',
        ]);
        $response->assertStatus(201);
        $this->assertEqualsWithDelta(40, $response->json('data.invoice.paidAmount'), 0.01);
        $this->assertEqualsWithDelta(60, $response->json('data.invoice.remainingAmount'), 0.01);
        $inv->refresh();
        $this->assertSame(40.0, (float) $inv->paid_amount);
        $this->assertSame(60.0, (float) $inv->remaining_amount);
    }

    /** @test */
    public function stock_consumption_insufficient_stock_returns_422(): void
    {
        $project = Project::factory()->create();
        $this->user->assignedProjects()->sync([$project->id]);
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 5]);
        $response = $this->actingAsSuperAdmin()->postJson('/api/stock-consumption-entries', [
            'project_id' => $project->id,
            'remarks' => 'Test',
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 10],
            ],
        ]);
        $response->assertStatus(422);
        $this->assertStringContainsString('Insufficient stock for', $response->json('message'));
    }

    /** @test */
    public function stock_consumption_valid_deducts_stock(): void
    {
        $project = Project::factory()->create();
        $this->user->assignedProjects()->sync([$project->id]);
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 100]);
        $response = $this->actingAsSuperAdmin()->postJson('/api/stock-consumption-entries', [
            'project_id' => $project->id,
            'remarks' => 'Foundation work',
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 30],
            ],
        ]);
        $response->assertStatus(201);
        $item->refresh();
        $this->assertSame(70.0, (float) $item->current_stock);
    }

    /** @test */
    public function stock_consumption_index_project_scoped_for_site_manager(): void
    {
        $projectA = Project::factory()->create();
        $projectB = Project::factory()->create();
        $siteManager = User::factory()->create(['role' => 'site_manager']);
        $siteManager->assignedProjects()->sync([$projectA->id]);
        StockConsumptionEntry::factory()->create(['project_id' => $projectA->id]);
        StockConsumptionEntry::factory()->create(['project_id' => $projectB->id]);
        Sanctum::actingAs($siteManager);
        $response = $this->getJson('/api/stock-consumption-entries');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    /** @test */
    public function vendor_invoice_update_reduces_qty_validates_inventory(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 5]);
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create(['vendor_id' => $vendor->id]);
        VendorInvoiceLineItem::factory()->create([
            'vendor_invoice_id' => $inv->id,
            'consumable_item_id' => $item->id,
            'quantity' => 10,
            'unit_cost' => 5,
            'line_total' => 50,
        ]);
        ConsumableItem::where('id', $item->id)->update(['current_stock' => 5]);

        $response = $this->actingAsSuperAdmin()->putJson("/api/vendor-invoices/{$inv->id}", [
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 2, 'unit_cost' => 5],
            ],
        ]);
        $response->assertStatus(422);
        $this->assertStringContainsString('would make inventory negative', $response->json('message'));
    }

    /** @test */
    public function vendor_invoice_update_increases_qty_adjusts_inventory(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 50]);
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create(['vendor_id' => $vendor->id]);
        VendorInvoiceLineItem::factory()->create([
            'vendor_invoice_id' => $inv->id,
            'consumable_item_id' => $item->id,
            'quantity' => 50,
            'unit_cost' => 10,
            'line_total' => 500,
        ]);

        $response = $this->actingAsSuperAdmin()->putJson("/api/vendor-invoices/{$inv->id}", [
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 60, 'unit_cost' => 10],
            ],
        ]);
        $response->assertStatus(200);
        $item->refresh();
        $this->assertSame(60.0, (float) $item->current_stock);
    }

    /** @test */
    public function vendor_invoice_delete_reverts_inventory(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 50]);
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create(['vendor_id' => $vendor->id]);
        VendorInvoiceLineItem::factory()->create([
            'vendor_invoice_id' => $inv->id,
            'consumable_item_id' => $item->id,
            'quantity' => 50,
            'unit_cost' => 10,
            'line_total' => 500,
        ]);

        $response = $this->actingAsSuperAdmin()->deleteJson("/api/vendor-invoices/{$inv->id}");
        $response->assertStatus(204);
        $item->refresh();
        $this->assertSame(0.0, (float) $item->current_stock);
    }

    /** @test */
    public function vendor_invoice_delete_insufficient_stock_returns_422(): void
    {
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 20]);
        $vendor = Vendor::factory()->create();
        $inv = VendorInvoice::factory()->create(['vendor_id' => $vendor->id]);
        VendorInvoiceLineItem::factory()->create([
            'vendor_invoice_id' => $inv->id,
            'consumable_item_id' => $item->id,
            'quantity' => 50,
            'unit_cost' => 10,
            'line_total' => 500,
        ]);

        $response = $this->actingAsSuperAdmin()->deleteJson("/api/vendor-invoices/{$inv->id}");
        $response->assertStatus(422);
        $this->assertStringContainsString('insufficient to revert', $response->json('message'));
    }

    /** @test */
    public function stock_consumption_update_increases_qty_validates_inventory(): void
    {
        $project = Project::factory()->create();
        $this->user->assignedProjects()->sync([$project->id]);
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 5]);
        $entry = StockConsumptionEntry::factory()->create(['project_id' => $project->id]);
        StockConsumptionLineItem::create([
            'stock_consumption_entry_id' => $entry->id,
            'consumable_item_id' => $item->id,
            'quantity' => 5,
        ]);
        ConsumableItem::where('id', $item->id)->update(['current_stock' => 0]);

        $response = $this->actingAsSuperAdmin()->putJson("/api/stock-consumption-entries/{$entry->id}", [
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 10],
            ],
        ]);
        $response->assertStatus(422);
        $this->assertStringContainsString('insufficient stock for', $response->json('message'));
    }

    /** @test */
    public function stock_consumption_update_decreases_qty_restores_inventory(): void
    {
        $project = Project::factory()->create();
        $this->user->assignedProjects()->sync([$project->id]);
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 70]);
        $entry = StockConsumptionEntry::factory()->create(['project_id' => $project->id]);
        StockConsumptionLineItem::create([
            'stock_consumption_entry_id' => $entry->id,
            'consumable_item_id' => $item->id,
            'quantity' => 30,
        ]);

        $response = $this->actingAsSuperAdmin()->putJson("/api/stock-consumption-entries/{$entry->id}", [
            'line_items' => [
                ['consumable_item_id' => $item->id, 'quantity' => 20],
            ],
        ]);
        $response->assertStatus(200);
        $item->refresh();
        $this->assertSame(80.0, (float) $item->current_stock);
    }

    /** @test */
    public function stock_consumption_delete_restores_inventory(): void
    {
        $project = Project::factory()->create();
        $this->user->assignedProjects()->sync([$project->id]);
        $unit = Unit::factory()->create();
        $item = ConsumableItem::factory()->create(['unit_id' => $unit->id, 'current_stock' => 70]);
        $entry = StockConsumptionEntry::factory()->create(['project_id' => $project->id]);
        StockConsumptionLineItem::create([
            'stock_consumption_entry_id' => $entry->id,
            'consumable_item_id' => $item->id,
            'quantity' => 30,
        ]);

        $response = $this->actingAsSuperAdmin()->deleteJson("/api/stock-consumption-entries/{$entry->id}");
        $response->assertStatus(204);
        $item->refresh();
        $this->assertSame(100.0, (float) $item->current_stock);
    }

    /** @test */
    public function unauthenticated_requests_to_protected_routes_return_401(): void
    {
        $this->getJson('/api/units')->assertStatus(401);
        $this->getJson('/api/vendors')->assertStatus(401);
        $this->getJson('/api/consumable-items')->assertStatus(401);
        $this->getJson('/api/vendor-invoices')->assertStatus(401);
        $this->getJson('/api/stock-consumption-entries')->assertStatus(401);
    }
}
