import { Suspense } from "react";

import AuthCard from "@/components/tactiq/AuthCard";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard mode="login" />
    </Suspense>
  );
}
