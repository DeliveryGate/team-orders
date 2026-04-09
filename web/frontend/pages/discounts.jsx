import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Layout, Card, Text, BlockStack, InlineStack, TextField, Button, Toast, Frame, Box, DataTable, Modal, FormLayout, Banner } from "@shopify/polaris";

const emptyForm = { minQty: "", message: "", discountPercent: "0", sortOrder: "0" };

export default function Discounts() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [plan, setPlan] = useState("free");
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/volume-discounts?shop=${shop}`).then(r => r.json()),
      fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()),
    ]).then(([d, s]) => { setDiscounts(d.discounts || []); setPlan(s.plan || "free"); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [shop]);

  const isPro = ["pro", "enterprise"].includes(plan);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (d) => { setEditing(d.id); setForm({ minQty: String(d.minQty), message: d.message, discountPercent: String(d.discountPercent), sortOrder: String(d.sortOrder) }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.minQty || !form.message) { setToast("Minimum quantity and message are required"); return; }
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/volume-discounts/${editing}?shop=${shop}` : `/api/volume-discounts?shop=${shop}`;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, minQty: parseInt(form.minQty), discountPercent: parseFloat(form.discountPercent), sortOrder: parseInt(form.sortOrder) }) });
    setSaving(false);
    if (res.ok) { setModalOpen(false); fetchData(); setToast(editing ? "Discount updated" : "Discount created"); }
    else { const d = await res.json(); setToast(d.error || "Failed to save"); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await fetch(`/api/volume-discounts/${id}?shop=${shop}`, { method: "DELETE" });
    setDeleting(null); fetchData(); setToast("Discount deleted");
  };

  const rows = discounts.map(d => [
    d.minQty + "+ trays",
    d.message,
    d.discountPercent > 0 ? `${d.discountPercent}% off` : "Message only",
    <InlineStack gap="200">
      <Button size="slim" onClick={() => openEdit(d)}>Edit</Button>
      <Button size="slim" tone="critical" loading={deleting === d.id} onClick={() => handleDelete(d.id)}>Delete</Button>
    </InlineStack>,
  ]);

  return (
    <Frame>
      <Page
        title="Volume Discounts"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
        primaryAction={isPro ? { content: "Add Discount Tier", onAction: openCreate } : undefined}
      >
        <Layout>
          {!isPro && (
            <Layout.Section>
              <Banner title="Pro plan required" tone="warning" action={{ content: "Upgrade to Pro", url: `/settings?shop=${shop}` }}>
                <Text>Volume discount tiers are available on the Pro plan ($59/month) and above. Upgrade to incentivise larger orders.</Text>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Volume Discount Tiers</Text>
                <Text variant="bodySm" tone="subdued">Show customers messages or apply automatic discounts when they order large quantities. Displayed in the storefront ordering widget.</Text>
                {loading ? (
                  <Box padding="400"><Text>Loading...</Text></Box>
                ) : rows.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text","text","text","text"]}
                    headings={["Threshold","Message","Discount","Actions"]}
                    rows={rows}
                  />
                ) : (
                  <Box padding="600">
                    <BlockStack gap="300" inlineAlign="center">
                      <Text tone="subdued" alignment="center">{isPro ? "No discount tiers configured yet." : "Upgrade to Pro to configure volume discounts."}</Text>
                      {isPro && <Button variant="primary" onClick={openCreate}>Add your first discount tier</Button>}
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
          title={editing ? "Edit Discount Tier" : "Add Discount Tier"}
          primaryAction={{ content: saving ? "Saving..." : "Save", onAction: handleSave, loading: saving }}
          secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField label="Minimum quantity (total trays)" type="number" value={form.minQty} onChange={v => setForm(f => ({...f, minQty: v}))} placeholder="e.g. 50" helpText="Trigger this tier when weekly total meets or exceeds this number" autoComplete="off" />
              <TextField label="Message shown to customer" value={form.message} onChange={v => setForm(f => ({...f, message: v}))} placeholder="e.g. Order 50+ trays and save 10%!" helpText="Displayed in the ordering widget when threshold is met" autoComplete="off" />
              <TextField label="Discount percent (0 = message only)" type="number" value={form.discountPercent} onChange={v => setForm(f => ({...f, discountPercent: v}))} suffix="%" helpText="Set to 0 to show a message without a price reduction" autoComplete="off" />
              <TextField label="Sort order" type="number" value={form.sortOrder} onChange={v => setForm(f => ({...f, sortOrder: v}))} autoComplete="off" />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
