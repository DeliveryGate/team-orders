import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Layout, Card, Text, BlockStack, InlineStack, TextField, Button, Badge, Toast, Frame, Box, DataTable, Modal, FormLayout, Checkbox } from "@shopify/polaris";

const emptyForm = { name: "", price: "", description: "", minOrderPerDay: "5", allergenInfo: "", active: true, sortOrder: "0" };

export default function Meals() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchSizes = () => {
    setLoading(true);
    fetch(`/api/meal-sizes?shop=${shop}`).then(r => r.json()).then(d => { setSizes(d.sizes || []); setLoading(false); });
  };

  useEffect(() => { fetchSizes(); }, [shop]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (size) => { setEditing(size.id); setForm({ name: size.name, price: String(size.price), description: size.description, minOrderPerDay: String(size.minOrderPerDay), allergenInfo: size.allergenInfo, active: size.active, sortOrder: String(size.sortOrder) }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.price) { setToast("Name and price are required"); return; }
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/meal-sizes/${editing}?shop=${shop}` : `/api/meal-sizes?shop=${shop}`;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: parseFloat(form.price), minOrderPerDay: parseInt(form.minOrderPerDay), sortOrder: parseInt(form.sortOrder) }) });
    setSaving(false);
    if (res.ok) { setModalOpen(false); fetchSizes(); setToast(editing ? "Meal size updated" : "Meal size created"); }
    else { const d = await res.json(); setToast(d.error || "Failed to save"); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await fetch(`/api/meal-sizes/${id}?shop=${shop}`, { method: "DELETE" });
    setDeleting(null); fetchSizes(); setToast("Meal size deleted");
  };

  const rows = sizes.map(s => [
    s.name,
    `$${s.price.toFixed(2)}`,
    s.description || "—",
    s.minOrderPerDay,
    s.allergenInfo || "—",
    <Badge tone={s.active ? "success" : "critical"}>{s.active ? "Active" : "Inactive"}</Badge>,
    <InlineStack gap="200">
      <Button size="slim" onClick={() => openEdit(s)}>Edit</Button>
      <Button size="slim" tone="critical" loading={deleting === s.id} onClick={() => handleDelete(s.id)}>Delete</Button>
    </InlineStack>,
  ]);

  return (
    <Frame>
      <Page
        title="Meal Sizes"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
        primaryAction={{ content: "Add Meal Size", onAction: openCreate }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Configured Meal Sizes</Text>
                <Text variant="bodySm" tone="subdued">Define the sizes/trays customers can order. Each size maps to a Shopify product variant.</Text>
                {loading ? (
                  <Box padding="400"><Text>Loading...</Text></Box>
                ) : rows.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text","text","text","numeric","text","text","text"]}
                    headings={["Name","Price","Description","Min/Day","Allergens","Status","Actions"]}
                    rows={rows}
                  />
                ) : (
                  <Box padding="600">
                    <BlockStack gap="300" inlineAlign="center">
                      <Text tone="subdued" alignment="center">No meal sizes configured yet.</Text>
                      <Button variant="primary" onClick={openCreate}>Add your first meal size</Button>
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? "Edit Meal Size" : "Add Meal Size"}
          primaryAction={{ content: saving ? "Saving..." : "Save", onAction: handleSave, loading: saving }}
          secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField label="Name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} placeholder="e.g. Small Tray, Large Tray" autoComplete="off" />
              <TextField label="Price per tray ($)" type="number" value={form.price} onChange={v => setForm(f => ({...f, price: v}))} prefix="$" autoComplete="off" />
              <TextField label="Description" value={form.description} onChange={v => setForm(f => ({...f, description: v}))} placeholder="e.g. Serves 8–10 people" autoComplete="off" />
              <TextField label="Minimum order per day" type="number" value={form.minOrderPerDay} onChange={v => setForm(f => ({...f, minOrderPerDay: v}))} helpText="Minimum number of this size that must be ordered per day" autoComplete="off" />
              <TextField label="Allergen information" value={form.allergenInfo} onChange={v => setForm(f => ({...f, allergenInfo: v}))} placeholder="e.g. Contains gluten, dairy" autoComplete="off" />
              <TextField label="Sort order" type="number" value={form.sortOrder} onChange={v => setForm(f => ({...f, sortOrder: v}))} autoComplete="off" />
              <Checkbox label="Active (visible to customers)" checked={form.active} onChange={v => setForm(f => ({...f, active: v}))} />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
