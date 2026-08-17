"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/lib/fisheries/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";

type Field =
  | {
      name: string;
      label: string;
      type?: "text" | "date" | "number";
      required?: boolean;
      defaultValue?: string;
    }
  | {
      name: string;
      label: string;
      type: "file";
      accept?: string;
      required?: boolean;
    }
  | {
      name: string;
      label: string;
      type: "select";
      required?: boolean;
      options: { value: string; label: string }[];
    }
  | {
      name: string;
      label: string;
      type: "textarea";
      required?: boolean;
      defaultValue?: string;
    };

type AdminCreateFormProps = {
  action: (
    prev: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>;
  hidden?: Record<string, string | number>;
  fields: Field[];
  submitLabel: string;
};

const initialState: AdminFormState = {};

export function AdminCreateForm({
  action,
  hidden,
  fields,
  submitLabel,
}: AdminCreateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm text-ink">
            {field.label}
          </label>
          {field.type === "select" ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              className={fieldClassName}
            >
              <option value="">Select</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "file" ? (
            <input
              id={field.name}
              name={field.name}
              type="file"
              accept={field.accept}
              required={field.required}
              className={fieldClassName}
            />
          ) : field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              required={field.required}
              defaultValue={field.defaultValue}
              rows={3}
              className={fieldClassName}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              defaultValue={field.defaultValue}
              step={field.type === "number" ? "any" : undefined}
              className={fieldClassName}
            />
          )}
        </div>
      ))}
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
