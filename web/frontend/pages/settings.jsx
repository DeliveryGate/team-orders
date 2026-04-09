import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Page, Layout, Card, TextField, Select, Button, Badge, Toast, Frame, Text, BlockStack, InlineStack, ChoiceList, Box, Divider } from "@shopify/polaris";

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

const PLANS = {
  free:       { name: "Free",       price: 0,   features: ["Basic day selector", "Up to 5 days", "No discount tiers"] },
  starter:    { name: "Starter",    price: 39,  features: ["Full day selector", "Minimum order enforcement", "Team notes", "Advance notice rules", "Allergen warnings"] },
  pro:        { name: "Pro",        price: 59,  features: ["Volume discount tiers", "Order history dashboard", "Recurring order scheduling", "Email confirmation"] },
  enterprise: { name: "Enterprise", price: 199, features: ["Corporate account integration", "Multi-site", "Custom branding", "API access", "Dedicated account manager"] },
};

export default function Settings() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [billingData, setBillingData] = useState(null);
  const [settings, setSettings] = useState(null);

  // Form state
  const [pageTitle, setPageTitle] = useState("");
  const [pageIntro, setPageIntro] = useState("");
  const [availableDays, setAvailableDays] = useState(["monday","tuesday","wednesday","thursday","friday"]);
  const [popularDays, setPopularDays] = useState([]);
  const [popularDaysLabel, setPopularDaysLabel] = useState("Most Popular");
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState("1");
  const [allergenDisclaimer, setAllergenDisclaimer] = useState("");

  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/billing/status?shop=${shop}`).then(r => r.json()),
      fetch(`/api/settings?shop=${shop}`).then(r => r.json()),
    ]).then(([billing, s]) => {
      setBillingData(billing);
      setSettings(s);
      setPageTitle(s.pageTitle || "Team Lunches");
      setPageIntro(s.pageIntro || "");
      setAvailableDays(s.availableDays || ["monday","tuesday","wednesday","thursday","friday"]);
      setPopularDays(s.popularDays || []);
      setPopularDaysLabel(s.popularDaysLabel || "Most Popular");
      setAdvanceNoticeDays(String(s.advanceNoticeDays ?? 1));
      setAllergenDisclaimer(s.allergenDisclaimer || "");
    });
  }, [shop]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/settings?shop=${shop}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageTitle, pageIntro, availableDays, popularDays, popularDaysLabel, advanceNoticeDays: parseInt(advanceNoticeDays) || 1, allergenDisclaimer }),
    });
    setSaving(false);
    if (res.ok) setToast("Settings saved");
    else setToast("Failed to save settings");
  };

  const handleSubscribe = async (plan) => {
    setSubscribing(plan);
    const res = await fetch(`/api/billing/subscribe?shop=${shop}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const d = await res.json();
    setSubscribing(null);
    if (d.confirmationUrl) window.top.location.href = d.confirmationUrl;
    else setToast(d.error || "Subscription failed");
  };

  if (!billingData || !settings) return (
    <Page title="Settings"><Card><Box padding="400"><Text>Loading...</Text></Box></Card></Page>
  );

  const currentPlan = billingData.plan || "free";
  const planBadge = { free: "new", starter: "info", pro: "success", enterprise: "attention" };

  const dayChoices = ALL_DAYS.map(d => ({ label: DAY_LABELS[d], value: d }));

  return (
    <Frame>
      <Page title="Settings" backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Storefront Page</Text>
                <TextField label="Page title" value={pageTitle} onChange={setPageTitle} placeholder="Team Lunches" autoComplete="off" helpText="Displayed as the hero heading on your ordering page" />
                <TextField label="Page intro text" value={pageIntro} onChange={setPageIntro} multiline={3} placeholder="Fresh catering delivered to your office on the days your team is in." autoComplete="off" />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Available Days</Text>
                <Text variant="bodySm" tone="subdued">Which days of the week can customers order for?</Text>
                <ChoiceList
                  title=""
                  allowMultiple
                  choices={dayChoices}
                  selected={availableDays}
                  onChange={setAvailableDays}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Popular Days</Text>
                <TextField label="Popular days label" value={popularDaysLabel} onChange={setPopularDaysLabel} placeholder="Most Popular" autoComplete="off" helpText="Label shown on days marked as popular (e.g. a star badge)" />
                <ChoiceList
                  title="Mark days as popular"
                  allowMultiple
                  choices={dayChoices.filter(d => availableDays.includes(d.value))}
                  selected={popularDays}
                  onChange={setPopularDays}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Order Rules</Text>
                <Select
                  label="Minimum advance notice (days)"
                  options={[
                    { label: "1 day", value: "1" },
                    { label: "2 days", value: "2" },
                    { label: "3 days", value: "3" },
                    { label: "5 days", value: "5" },
                    { label: "7 days", value: "7" },
                  ]}
                  value={advanceNoticeDays}
                  onChange={setAdvanceNoticeDays}
                  helpText="How far in advance customers must place orders. Affects the earliest selectable week."
                />
                <TextField label="Allergen disclaimer" value={allergenDisclaimer} onChange={setAllergenDisclaimer} multiline={2} placeholder="Please inform us of any allergies or dietary requirements before ordering." autoComplete="off" helpText="Shown prominently on the ordering widget" />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Button variant="primary" loading={saving} onClick={handleSave} size="large">Save Settings</Button>
          </Layout.Section>

          <Layout.Section>
            <Divider />
          </Layout.Section>

          <Layout.Section>
            <Text variant="headingMd" as="h2">Plans</Text>
          </Layout.Section>

          {Object.entries(PLANS).map(([key, plan]) => (
            <Layout.Section variant="oneThird" key={key}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h3">{plan.name}</Text>
                    {key === currentPlan && <Badge tone="success">Current</Badge>}
                  </InlineStack>
                  <Text variant="headingXl" as="p">{plan.price === 0 ? "Free" : `$${plan.price}/mo`}</Text>
                  <BlockStack gap="100">
                    {plan.features.map(f => <Text key={f} variant="bodySm">{f}</Text>)}
                  </BlockStack>
                  {key !== "free" && key !== currentPlan && (
                    <Button variant="primary" loading={subscribing === key} onClick={() => handleSubscribe(key)}>
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
