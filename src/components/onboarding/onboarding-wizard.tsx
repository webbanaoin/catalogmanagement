"use client";

import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
} from "@/components/ui";

const steps = [
  "Shop information",
  "Contact details",
  "Location",
  "Opening hours",
  "Category",
  "First product",
  "Completion",
] as const;

type Step = (typeof steps)[number];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function OnboardingWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep: Step = steps[stepIndex];

  function next() {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function back() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Setup progress</CardTitle>
            <CardDescription>
              Sprint 1 keeps profile setup local until server-side onboarding contracts are available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const complete = index < stepIndex;
                return (
                  <li key={step}>
                    <button
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted",
                      ].join(" ")}
                      aria-current={active ? "step" : undefined}
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-semibold"
                        aria-hidden="true"
                      >
                        {complete ? "✓" : index + 1}
                      </span>
                      <span className="min-w-0">{step}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </aside>

      <section aria-labelledby="onboarding-step-title">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                Step {stepIndex + 1} of {steps.length}
              </Badge>
              {(currentStep === "Category" || currentStep === "First product") && (
                <Badge>Deferred contract</Badge>
              )}
            </div>
            <CardTitle id="onboarding-step-title" className="mt-2">
              {currentStep}
            </CardTitle>
            <CardDescription>
              {currentStep === "Category" || currentStep === "First product"
                ? "This step is reserved for the owning catalogue sprint and will activate only after its API contract is finalized."
                : "Review the fields and UX for this onboarding step. No profile data is persisted from this Sprint 1 branch yet."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentStep === "Shop information" ? <ShopInformationStep /> : null}
            {currentStep === "Contact details" ? <ContactStep /> : null}
            {currentStep === "Location" ? <LocationStep /> : null}
            {currentStep === "Opening hours" ? <OpeningHoursStep /> : null}
            {currentStep === "Category" ? (
              <DeferredStep
                title="Category setup waits for the catalogue contract"
                description="Business categories are data-driven and must not be hard-coded into reusable UI logic."
              />
            ) : null}
            {currentStep === "First product" ? (
              <DeferredStep
                title="First product waits for product and media contracts"
                description="Product creation and image upload belong to later catalogue/S3 work, so this step intentionally creates no shadow product model."
              />
            ) : null}
            {currentStep === "Completion" ? <CompletionStep /> : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={back}
                disabled={stepIndex === 0}
              >
                Back
              </Button>
              {stepIndex < steps.length - 1 ? (
                <Button type="button" onClick={next}>
                  Continue
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ShopInformationStep() {
  return (
    <div className="space-y-5">
      <Field label="Shop name" htmlFor="onboarding-shop-name" required>
        <Input id="onboarding-shop-name" name="shopName" autoComplete="organization" />
      </Field>
      <Field label="Tagline" htmlFor="onboarding-tagline">
        <Input id="onboarding-tagline" name="tagline" maxLength={160} />
      </Field>
      <Field label="About the shop" htmlFor="onboarding-about">
        <Textarea id="onboarding-about" name="description" />
      </Field>
    </div>
  );
}

function ContactStep() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Phone" htmlFor="onboarding-phone">
        <Input id="onboarding-phone" name="phone" type="tel" autoComplete="tel" />
      </Field>
      <Field label="WhatsApp" htmlFor="onboarding-whatsapp">
        <Input id="onboarding-whatsapp" name="whatsapp" type="tel" />
      </Field>
      <Field label="Shop email" htmlFor="onboarding-email" className="sm:col-span-2">
        <Input id="onboarding-email" name="email" type="email" autoComplete="email" />
      </Field>
    </div>
  );
}

function LocationStep() {
  return (
    <div className="space-y-5">
      <Field label="Address" htmlFor="onboarding-address">
        <Textarea id="onboarding-address" name="address" autoComplete="street-address" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City" htmlFor="onboarding-city">
          <Input id="onboarding-city" name="city" autoComplete="address-level2" />
        </Field>
        <Field label="State" htmlFor="onboarding-state">
          <Input id="onboarding-state" name="state" autoComplete="address-level1" />
        </Field>
        <Field label="PIN" htmlFor="onboarding-pincode">
          <Input id="onboarding-pincode" name="pincode" autoComplete="postal-code" />
        </Field>
      </div>
      <Field label="Google Maps URL" htmlFor="onboarding-maps-url">
        <Input id="onboarding-maps-url" name="googleMapsUrl" type="url" inputMode="url" />
      </Field>
    </div>
  );
}

function OpeningHoursStep() {
  return (
    <div className="space-y-4">
      <Alert>
        Opening-hours serialization is intentionally not defined here. These controls demonstrate the mobile UX only.
      </Alert>
      <div className="space-y-3">
        {weekDays.map((day) => (
          <div
            key={day}
            className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[7rem_1fr_1fr]"
          >
            <p className="self-center text-sm font-medium text-foreground">{day}</p>
            <Field label="Opens" htmlFor={`opens-${day.toLowerCase()}`}>
              <Input id={`opens-${day.toLowerCase()}`} type="time" />
            </Field>
            <Field label="Closes" htmlFor={`closes-${day.toLowerCase()}`}>
              <Input id={`closes-${day.toLowerCase()}`} type="time" />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeferredStep({ title, description }: { title: string; description: string }) {
  return <Alert variant="warning" title={title}>{description}</Alert>;
}

function CompletionStep() {
  return (
    <Alert variant="success" title="Onboarding UI reviewed">
      Sprint 1 now has the complete presentation flow. Persisting shop profile, hours, category and first-product data will be connected only after the corresponding server contracts are merged.
    </Alert>
  );
}
