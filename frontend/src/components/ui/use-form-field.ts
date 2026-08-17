import * as React from "react"
import type { FieldPath, FieldValues } from "react-hook-form"
import { useFormContext } from "react-hook-form"

type FormFieldErrorContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldErrorContext = React.createContext<FormFieldErrorContextValue>(
  {} as FormFieldErrorContextValue
)

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const useFormField = () => {
  const itemContext = React.useContext(FormItemContext)
  const fieldErrorContext = React.useContext(FormFieldErrorContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldErrorContext.name, formState)

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldErrorContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

export { FormFieldErrorContext, FormItemContext, useFormField }
