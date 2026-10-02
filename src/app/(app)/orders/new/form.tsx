"use client";

import { useActionState, useState } from "react";
import { createOrder } from "../actions";
import { Card, ErrorNote, Field, FormGrid, Input, Select, Textarea } from "@/components/ui";
import { PAYMENT_METHODS, PRODUCT_CATEGORIES } from "@/lib/constants";
import { isoDay } from "@/lib/format";

type Opt = { id: string; name: string };
type Item = { key: number; quantity: number; price: string };

export function NewOrderForm({
  customers,
  execs,
  accounts,
  rate,
  isSales,
  currentUserId,
  presetCustomerId,
}: {
  customers: (Opt & { country: string | null })[];
  execs: Opt[];
  accounts: (Opt & { currency: string })[];
  rate: number;
  isSales: boolean;
  currentUserId: string;
  presetCustomerId?: string;
}) {
  const [error, action, pending] = useActionState(createOrder, undefined);
  const [customerId, setCustomerId] = useState(presetCustomerId ?? "");
  const [items, setItems] = useState<Item[]>([{ key: 0, quantity: 1, price: "" }]);
  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * i.quantity, 0);

  return (
    <form action={action} className="space-y-4">
      <Card title="Customer">
        <Field label="Customer">
          <Select
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="+ New customer"
            options={customers.map((c) => ({ value: c.id, label: c.country ? `${c.name} (${c.country})` : c.name }))}
          />
        </Field>
        {!customerId && (
          <div className="mt-4">
            <FormGrid>
              <Field label="Full name">
                <Input name="customer.name" required />
              </Field>
              <Field label="WhatsApp">
                <Input name="customer.whatsapp" type="tel" />
              </Field>
              <Field label="Phone">
                <Input name="customer.phone" type="tel" />
              </Field>
              <Field label="Email">
                <Input name="customer.email" type="email" />
              </Field>
              <Field label="Country">
                <Input name="customer.country" list="countries" />
              </Field>
              <Field label="City">
                <Input name="customer.city" />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Textarea name="customer.address" />
              </Field>
              <Field label="Where did they find us?">
                <Input name="customer.source" placeholder="Instagram, WhatsApp, Google…" />
              </Field>
            </FormGrid>
            <datalist id="countries">
              {["United States", "Canada", "United Kingdom", "Australia", "India", "UAE"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        )}
      </Card>

      <Card title="Order">
        <FormGrid>
          <Field label="Order date">
            <Input name="date" type="date" defaultValue={isoDay()} required />
          </Field>
          {!isSales && (
            <Field label="Sales executive">
              <Select name="salesExecId" defaultValue={currentUserId} placeholder="None" options={execs.map((e) => ({ value: e.id, label: e.name }))} />
            </Field>
          )}
          <Field label="Source">
            <Select
              name="source"
              defaultValue="EMPLOYEE"
              options={[
                { value: "EMPLOYEE", label: "Employee order" },
                { value: "WEBSITE", label: "Website (Shopify)" },
                { value: "ETSY", label: "Etsy" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Website order ID">
            <Input name="websiteOrderId" placeholder="#IVEVAR1022" />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue="CONFIRMED"
              options={[
                { value: "ENQUIRY", label: "Enquiry" },
                { value: "CONFIRMED", label: "Confirmed" },
                { value: "IN_PRODUCTION", label: "In production" },
              ]}
            />
          </Field>
          <Field label="Priority">
            <Select name="priority" placeholder="Normal" options={["Urgent", "High"]} />
          </Field>
          <Field label="Required before">
            <Input name="requiredBy" type="date" />
          </Field>
          <Field label="Engraving">
            <Input name="engraving" placeholder="Text to engrave, if any" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isGift" /> This is a gift
          </label>
        </FormGrid>
      </Card>

      <Card title="Items">
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div key={it.key} className="rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <Field label="Product" className="col-span-2 sm:col-span-3">
                  <Input name="item.name" required placeholder="Cartier iced-out watch 41mm" />
                </Field>
                <Field label="Category" className="col-span-2 sm:col-span-3">
                  <Select name="item.category" placeholder="—" options={PRODUCT_CATEGORIES} />
                </Field>
                <Field label="Metal" className="sm:col-span-2">
                  <Input name="item.metal" placeholder="925 silver, 14k gold" />
                </Field>
                <Field label="Stone" className="sm:col-span-2">
                  <Input name="item.stone" placeholder="Moissanite, lab diamond" />
                </Field>
                <Field label="Qty">
                  <Input
                    name="item.quantity"
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))}
                  />
                </Field>
                <Field label="Price each (USD)">
                  <Input
                    name="item.priceUsd"
                    inputMode="decimal"
                    required
                    value={it.price}
                    onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, price: e.target.value } : x)))}
                  />
                </Field>
                <Field label="Size and other details" className="col-span-2 sm:col-span-6">
                  <Input name="item.specs" placeholder="Ring size 9, 41mm dial…" />
                </Field>
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems(items.filter((x) => x.key !== it.key))} className="mt-2 text-sm text-rose-600">
                  Remove item {idx + 1}
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setItems([...items, { key: Date.now(), quantity: 1, price: "" }])}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              + Add item
            </button>
            <div className="text-right">
              <div className="text-xs text-slate-500">Order total</div>
              <div className="text-lg font-semibold">${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
            </div>
          </div>
          <Field label="USD to INR rate for this order" hint="Used to work out profit in rupees.">
            <Input name="usdInrRate" inputMode="decimal" defaultValue={rate} />
          </Field>
        </div>
      </Card>

      <Card title="Payment received now (optional)">
        <FormGrid>
          <Field label="Amount" hint="In the account's currency">
            <Input name="deposit.amount" inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Received in account">
            <Select name="deposit.accountId" placeholder="Choose…" options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))} />
          </Field>
          <Field label="Payment method">
            <Select name="deposit.method" options={PAYMENT_METHODS} />
          </Field>
        </FormGrid>
        {isSales && <p className="mt-2 text-xs text-slate-500">Owner or accounts will confirm this payment.</p>}
      </Card>

      <Card title="Notes">
        <Textarea name="notes" placeholder="Special instructions" />
      </Card>

      <ErrorNote message={error} />
      <button disabled={pending} className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto sm:px-8">
        {pending ? "Saving…" : "Save order"}
      </button>
    </form>
  );
}
