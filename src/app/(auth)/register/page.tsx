import { Suspense } from "react";

import AuthCard from "@/components/tactiq/AuthCard";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Бүртгүүлэх" };

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthCard mode="register" />
    </Suspense>
  );
}
