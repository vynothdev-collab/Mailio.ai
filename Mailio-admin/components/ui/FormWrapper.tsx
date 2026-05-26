"use client";

import { FormHTMLAttributes } from "react";

interface FormWrapperProps extends FormHTMLAttributes<HTMLFormElement> {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function FormWrapper({ children, onSubmit, ...props }: FormWrapperProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form onSubmit={handleSubmit} noValidate {...props}>
      {children}
    </form>
  );
}
