import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button, Box, DataTable, Frame } from "@shopify/polaris";

export default function Dashboard() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [status, setStatus] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()).then(setStatus);
    fetch(`/api/orders?shop=${shop}&page=1`).then(r => r.json()).then(d => setRecentOrders(d.orders?.slice(0, 5) || []));
  }, [shop]);

  if (!status) return (
    <Page title="Team Orders"><Card><Box padding="400"><Text>Loading...</Text></Box></Card></Page>
  );

  const planBadge = { free: "new", starter: "info", pro: "success", enterprise: "attention" };

  const orderRows = recentOrders.map(o => [
    o.weekCommencing,
    o.totalTrays,
    `$${(o.totalPrice || 0).toFixed(2)}`,
    o.status,
    new Date(o.createdAt).toLocaleDateString(),
  ]);

  return (
    <Frame>
      <Page
        title="Team Orders Dashboard"
        primaryAction={{ content: "Configure Meals", onAction: () => navigate(`/meals?shop=${shop}`) }}
      >
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingMd" as="h2">Plan</Text>
                  <Badge tone={planBadge[status.plan] || "new"}>{status.plan?.charAt(0).toUpperCase() + status.plan?.slice(1)}</Badge>
                </InlineStack>
                <Text variant="headingXl" as="p">{status.planDetails?.name || "Free"}</Text>
                <Text variant="bodySm" tone="subdued">${status.price || 0}/month</Text>
                {status.plan === "free" && (
                  <Button variant="primary" size="slim" onClick={() => navigate(`/settings?shop=${shop}`)}>Upgrade Plan</Button>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Total Orders</Text>
                <Text variant="heading2xl" as="p">{status.orderCount || 0}</Text>
                <Text variant="bodySm" tone="subdued">All time weekly orders</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Total Revenue</Text>
                <Text variant="heading2xl" as="p">${(status.totalRevenue || 0).toFixed(2)}</Text>
                <Text variant="bodySm" tone="subdued">Processed through your store</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">Recent Orders</Text>
                  <Button variant="plain" onClick={() => navigate(`/orders?shop=${shop}`)}>View all</Button>
                </InlineStack>
                {orderRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "numeric", "text", "text", "text"]}
                    headings={["Week Commencing", "Total Trays", "Total Price", "Status", "Created"]}
                    rows={orderRows}
                  />
                ) : (
                  <Box padding="400">
                    <Text tone="subdued" alignment="center">No orders yet. Orders placed through your storefront will appear here.</Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Quick Setup</Text>
                <Text variant="bodySm">Get your weekly ordering system live in 3 steps:</Text>
                <InlineStack gap="200" wrap>
                  <Button onClick={() => navigate(`/meals?shop=${shop}`)}>1. Add Meal Sizes</Button>
                  <Button onClick={() => navigate(`/settings?shop=${shop}`)}>2. Configure Days & Settings</Button>
                  <Button onClick={() => navigate(`/discounts?shop=${shop}`)}>3. Set Volume Discounts</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
