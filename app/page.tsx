"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, LogIn, User, Mail, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/firestore";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<LoginFormData>({
    email: "me199@admin.xo",
    password: "me199@admin.xo",
  });

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push("/notifications");
    } catch (err) {
      setError("فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950" />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="floating-orb orb-1" />
        <div className="floating-orb orb-2" />
        <div className="floating-orb orb-3" />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
      
      <div className="grid-background absolute inset-0 opacity-20" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8 animate-float">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse-glow" />
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-full border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
              <User className="h-16 w-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-emerald-400 animate-sparkle" />
          </div>
        </div>

        <Card className="relative border-0 shadow-2xl bg-slate-900/70 backdrop-blur-2xl text-white rounded-3xl overflow-hidden animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />

          <CardHeader className="relative space-y-2 text-center pt-10 pb-2">
            <CardTitle className="text-4xl font-black bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 bg-clip-text text-transparent drop-shadow-lg">
              تسجيل الدخول
            </CardTitle>
            <p className="text-slate-400 text-base">
              مرحباً بك مرة أخرى، يرجى تعبئة بياناتك
            </p>
          </CardHeader>

          <CardContent className="relative pt-8 pb-10 px-8">
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-3">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-300 flex items-center gap-2"
                >
                  <Mail className="h-4 w-4 text-emerald-400" />
                  البريد الإلكتروني
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition-opacity duration-300" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="اكتب بريدك الإلكتروني"
                    className="relative h-12 bg-slate-800/80 border-2 border-slate-700/50 focus:border-emerald-500/50 text-white placeholder:text-slate-500 rounded-xl transition-all duration-300 text-base"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-slate-300 flex items-center gap-2"
                >
                  <Lock className="h-4 w-4 text-emerald-400" />
                  كلمة المرور
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition-opacity duration-300" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="اكتب كلمة المرور"
                    className="relative h-12 bg-slate-800/80 border-2 border-slate-700/50 focus:border-emerald-500/50 text-white placeholder:text-slate-500 pr-12 rounded-xl transition-all duration-300 text-base"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-red-300 text-sm text-center bg-red-500/10 p-4 rounded-xl border border-red-500/30 backdrop-blur-sm animate-shake">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  className="relative w-full h-14 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-lg rounded-xl transition-all duration-300 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
                  disabled={isLoading}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="loading-spinner" />
                      جاري تسجيل الدخول...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <span>تسجيل الدخول</span>
                      <LogIn className="h-6 w-6" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center animate-fade-in-delayed">
          <p className="text-slate-600 text-sm flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-600" />
            © {new Date().getFullYear()} جميع الحقوق محفوظة
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-600" />
          </p>
        </div>
      </div>
    </div>
  );
}
