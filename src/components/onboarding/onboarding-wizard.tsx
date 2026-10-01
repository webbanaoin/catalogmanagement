"use client";

import { useState, type FormEvent } from "react";

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
import {
  isValidEmail,
  isValidHttpUrl,
  isValidIndianMobile,
  isValidIndianPhone,
  isValidIndianPincode,
} from "@/lib/validation";

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
type FieldErrors = Record<string, string>;

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function rawValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function validateStep(step: Step, formData: FormData): FieldErrors {
  const errors: FieldErrors = {};

  if (step === "Shop information") {
    const shopName = rawValue(formData, "shopName").trim();

    if (shopName.length < 2) {
      errors.shopName = shopName
        ? "Shop name must contain at least 2 characters."
        : "Shop name is required.";
    } else if (shopName.length > 160) {
      errors.shopName = "Shop name must contain at most 160 characters.";
    }
  }

  if (step === "Contact details") {
    const phone = rawValue(formData, "phone");
    const whatsapp = rawValue(formData, "whatsapp");
    const email = rawValue(formData, "email").trim();

    if (phone && !phone.trim()) {
      errors.phone = "Phone cannot contain only spaces.";
    } else if (phone.trim() && !isValidIndianPhone(phone)) {
      errors.phone = "Enter a valid Indian phone number.";
    }

    if (whatsapp && !whatsapp.trim()) {
      errors.whatsapp = "WhatsApp number cannot contain only spaces.";
    } else if (whatsapp.trim() && !isValidIndianMobile(whatsapp)) {
      errors.whatsapp = "Enter a valid 10-digit Indian mobile number.";
    }

    if (email && !isValidEmail(email)) {
      errors.email = "Enter a valid email address.";
    }
  }

  if (step === "Location") {
    for (const [field, label] of [
      ["address", "Address"],
      ["city", "City"],
      ["state", "State"],
    ] as const) {
      const raw = rawValue(formData, field);
      if (raw && !raw.trim()) {
        errors[field] = `${label} cannot contain only spaces.`;
      }
    }

    const pincode = rawValue(formData, "pincode");
    if (pincode && !pincode.trim()) {
      errors.pincode = "PIN cannot contain only spaces.";
    } else if (pincode.trim() && !isValidIndianPincode(pincode)) {
      errors.pincode = "Enter a valid 6-digit Indian PIN.";
    }

    const mapsUrl = rawValue(formData, "googleMapsUrl");
    if (mapsUrl && !mapsUrl.trim()) {
      errors.googleMapsUrl = "Google Maps URL cannot contain only spaces.";
    } else if (mapsUrl.trim() && !isValidHttpUrl(mapsUrl)) {
      errors.googleMapsUrl = "Enter a valid http:// or https:// URL.";
    }
  }

  if (step === "Opening hours") {
    for (const day of weekDays) {
      const key = day.toLowerCase();
      const opens = rawValue(formData, `${key}Opens`);
      const closes = rawValue(formData, `${key}Closes`);

      if (opens && !closes) {
        errors[`${key}Closes`] = "Enter a closing time when an opening time is set.";
      } else if (!opens && closes) {
        errors[`${key}Opens`] = "Enter an opening time when a closing time is set.";
      }
    }
  }

  return errors;
}

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  const control = firstField ? form.elements.namedItem(firstField) : null;

  if (control instanceof HTMLElement) {
    control.focus();
  }
}

function describedBy(id: string, error: string | undefined, hasHint = false): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

export function OnboardingWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const currentStep: Step = steps[stepIndex];

  function back() {
    setFieldErrors({});
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function navigateToVisitedStep(index: number) {
    if (index <= maxVisitedStep) {
      setFieldErrors({});
      setStepIndex(index);
    }
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateStep(currentStep, new FormData(form));

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalid(form, errors);
      return;
    }

    setFieldErrors({});

    if (stepIndex < steps.length - 1) {
      const nextStep = stepIndex + 1;
      setStepIndex(nextStep);
      setMaxVisitedStep((current) => Math.max(current, nextStep));
    }
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
                const available = index <= maxVisitedStep;

                return (
                  <li key={step}>
                    <button
                      type="button"
                      onClick={() => navigateToVisitedStep(index)}
                      disabled={!available}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        "disabled:cursor-not-allowed disabled:opacity-50",
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
        <form onSubmit={handleContinue} noValidate>
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
              <div hidden={currentStep !== "Shop information"}>
                <ShopInformationStep errors={fieldErrors} />
              </div>
              <div hidden={currentStep !== "Contact details"}>
                <ContactStep errors={fieldErrors} />
              </div>
              <div hidden={currentStep !== "Location"}>
                <LocationStep errors={fieldErrors} />
              </div>
              <div hidden={currentStep !== "Opening hours"}>
                <OpeningHoursStep errors={fieldErrors} />
              </div>
              <div hidden={currentStep !== "Category"}>
                <DeferredStep
                  title="Category setup waits for the catalogue contract"
                  description="Business categories are data-driven and must not be hard-coded into reusable UI logic."
                />
              </div>
              <div hidden={currentStep !== "First product"}>
                <DeferredStep
                  title="First product waits for product and media contracts"
                  description="Product creation and image upload belong to later catalogue/S3 work, so this step intentionally creates no shadow product model."
                />
              </div>
              <div hidden={currentStep !== "Completion"}>
                <CompletionStep />
              </div>

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
                  <Button type="submit">Continue</Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </form>
      </section>
    </div>
  );
}

function ShopInformationStep({ errors }: { errors: FieldErrors }) {
  return (
    <div className="space-y-5">
      <Field label="Shop name" htmlFor="onboarding-shop-name" error={errors.shopName} required>
        <Input
          id="onboarding-shop-name"
          name="shopName"
          autoComplete="organization"
          minLength={2}
          maxLength={160}
          required
          aria-invalid={Boolean(errors.shopName)}
          aria-describedby={describedBy("onboarding-shop-name", errors.shopName)}
        />
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

function ContactStep({ errors }: { errors: FieldErrors }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        label="Phone"
        htmlFor="onboarding-phone"
        hint="Indian mobile or landline number."
        error={errors.phone}
      >
        <Input
          id="onboarding-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy("onboarding-phone", errors.phone, true)}
        />
      </Field>
      <Field
        label="WhatsApp"
        htmlFor="onboarding-whatsapp"
        hint="10-digit Indian mobile number; +91 formatting is accepted."
        error={errors.whatsapp}
      >
        <Input
          id="onboarding-whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          maxLength={18}
          aria-invalid={Boolean(errors.whatsapp)}
          aria-describedby={describedBy("onboarding-whatsapp", errors.whatsapp, true)}
        />
      </Field>
      <Field
        label="Shop email"
        htmlFor="onboarding-email"
        error={errors.email}
        className="sm:col-span-2"
      >
        <Input
          id="onboarding-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("onboarding-email", errors.email)}
        />
      </Field>
    </div>
  );
}

function LocationStep({ errors }: { errors: FieldErrors }) {
  return (
    <div className="space-y-5">
      <Field label="Address" htmlFor="onboarding-address" error={errors.address}>
        <Textarea
          id="onboarding-address"
          name="address"
          autoComplete="street-address"
          aria-invalid={Boolean(errors.address)}
          aria-describedby={describedBy("onboarding-address", errors.address)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City" htmlFor="onboarding-city" error={errors.city}>
          <Input
            id="onboarding-city"
            name="city"
            autoComplete="address-level2"
            aria-invalid={Boolean(errors.city)}
            aria-describedby={describedBy("onboarding-city", errors.city)}
          />
        </Field>
        <Field label="State" htmlFor="onboarding-state" error={errors.state}>
          <Input
            id="onboarding-state"
            name="state"
            autoComplete="address-level1"
            aria-invalid={Boolean(errors.state)}
            aria-describedby={describedBy("onboarding-state", errors.state)}
          />
        </Field>
        <Field
          label="PIN"
          htmlFor="onboarding-pincode"
          hint="6-digit Indian PIN."
          error={errors.pincode}
        >
          <Input
            id="onboarding-pincode"
            name="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            pattern="[1-9][0-9]{5}"
            aria-invalid={Boolean(errors.pincode)}
            aria-describedby={describedBy("onboarding-pincode", errors.pincode, true)}
          />
        </Field>
      </div>
      <Field
        label="Google Maps URL"
        htmlFor="onboarding-maps-url"
        hint="Use a complete http:// or https:// link."
        error={errors.googleMapsUrl}
      >
        <Input
          id="onboarding-maps-url"
          name="googleMapsUrl"
          type="url"
          inputMode="url"
          aria-invalid={Boolean(errors.googleMapsUrl)}
          aria-describedby={describedBy("onboarding-maps-url", errors.googleMapsUrl, true)}
        />
      </Field>
    </div>
  );
}

function OpeningHoursStep({ errors }: { errors: FieldErrors }) {
  return (
    <div className="space-y-4">
      <Alert>
        Opening-hours serialization is intentionally not defined here. These controls validate paired opening and closing times only.
      </Alert>
      <div className="space-y-3">
        {weekDays.map((day) => {
          const key = day.toLowerCase();
          const opensName = `${key}Opens`;
          const closesName = `${key}Closes`;
          const opensId = `opens-${key}`;
          const closesId = `closes-${key}`;

          return (
            <div
              key={day}
              className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[7rem_1fr_1fr]"
            >
              <p className="self-center text-sm font-medium text-foreground">{day}</p>
              <Field label="Opens" htmlFor={opensId} error={errors[opensName]}>
                <Input
                  id={opensId}
                  name={opensName}
                  type="time"
                  aria-invalid={Boolean(errors[opensName])}
                  aria-describedby={describedBy(opensId, errors[opensName])}
                />
              </Field>
              <Field label="Closes" htmlFor={closesId} error={errors[closesName]}>
                <Input
                  id={closesId}
                  name={closesName}
                  type="time"
                  aria-invalid={Boolean(errors[closesName])}
                  aria-describedby={describedBy(closesId, errors[closesName])}
                />
              </Field>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeferredStep({ title, description }: { title: string; description: string }) {
  return (
    <Alert variant="warning" title={title}>
      {description}
    </Alert>
  );
}

function CompletionStep() {
  return (
    <Alert variant="success" title="Onboarding UI reviewed">
      Sprint 1 now has the complete presentation flow. Persisting shop profile, hours, category and first-product data will be connected only after the corresponding server contracts are merged.
    </Alert>
  );
}
