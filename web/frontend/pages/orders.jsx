import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, Toast, Frame, Box, DataTable, Pagination, Badge, Banner } from "@shopify/polaris";

export default function Orders() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [plan, setPlan] = useState("free");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [toast, setToast] = useState(null);

  const fetchOrders = (p = 1) => {
    setLoading(true);
    fetch(`/api/orders?shop=${shop}&page=${p}`).then(r => r.json()).then(d => {
      setOrders(d.orders || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()).then(d => setPlan(d.plan || "free"));
    fetchOrders(1);
  }, [shop]);

  const isPro = ["pro", "enterprise"].includes(plan);

  const statusTone = { pending: "attention", confirmed: "success", cancelled: "critical", complete: "success" };

  const rows = orders.map(o => {
    const dayOrders = (() => { try { return JSON.parse(o.dayOrders); } catch { return {}; } })();
    const daysStr = Object.entries(dayOrders).filter(([,qty]) => parseInt(qty) > 0).map(([day, qty]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${qty}`).join(", ") || "—";
    return [
      o.weekCommencing,
      daysStr,
      o.totalTrays,
      `$${(o.totalPrice || 0).toFixed(2)}`,
      <Badge tone={statusTone[o.status] || "new"}>{o.status}</Badge>,
      o.teamNotes || "—",
      new Date(o.createdAt).toLocaleDateString(),
    ];
  });

  return (
    <Frame>
      <Page
        title="Order History"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
      >
        <Layout>
          {!isPro && (
            <Layout.Section>
              <Banner title="Pro plan required" tone="warning" action={{ content: "Upgrade to Pro", url: `/settings?shop=${shop}` }}>
                <Text>Order history is available on the Pro plan ($59/month) and above.</Text>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">Weekly Orders</Text>
                  <Text tone="subdued">{total} total orders</Text>
                </InlineStack>
                {loading ? (
                  <Box padding="400"><Text>Loading...</Text></Box>
                ) : rows.length > 0 ? (
                  <>
                    <DataTable
                      columnContentTypes={["text","text","numeric","text","text","text","text"]}
                      headings={["Week Commencing","Day Breakdown","Total Trays","Total Price","Status","Team Notes","Created"]}
                      rows={rows}
                    />
                    {pages > 1 && (
                      <Box padding="400">
                        <Pagination
                          hasPrevious={page > 1}
                          onPrevious={() => { const p = page - 1; setPage(p); fetchOrders(p); }}
                          hasNext={page < pages}
                          onNext={() => { const p = page + 1; setPage(p); fetchOrders(p); }}
                          label={`Page ${page} of ${pages}`}
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <Box padding="600">
                    <Text tone="subdued" alignment="center">No orders yet. Orders placed through your storefront will appear here automatically.</Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
