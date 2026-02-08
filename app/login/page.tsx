"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setError("");

    try {
      const data = await apiClient.login(email, password);

      // Store the JWT token in localStorage
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        router.push("/tasks");
      } else {
        throw new Error("No access token received");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-slate-600">
                Sign in to access your tasks
              </p>
            </div>

            <AuthForm mode="login" onSubmit={handleLogin} error={error} />

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
