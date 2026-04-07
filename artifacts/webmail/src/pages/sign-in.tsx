import { SignIn } from "@clerk/react";
import { Mail, CheckCircle, Zap } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 40%, #7c3aed 70%, #5b21b6 100%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-2xl text-white tracking-tight">Weyn Emails</span>
      </div>

      {/* Headline */}
      <div className="text-center mb-6 max-w-lg">
        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Web Domain Email Platform</p>
        <h1 className="text-3xl font-extrabold text-white leading-tight mb-3">
          Receive Emails on Your Custom Domain — Instantly.
        </h1>
        <p className="text-white/75 text-sm leading-relaxed">
          Catch any email sent to <strong>@weyn.store</strong> or <strong>@jhames.shop</strong>. Just type an alias and start receiving right away.
        </p>
      </div>

      {/* Tier caption cards */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 w-full max-w-lg">
        <div className="flex-1 flex items-start gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <CheckCircle className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">FREE</p>
            <p className="text-white/65 text-xs leading-relaxed mt-0.5">
              Facebook security codes only — 8-digit verification codes from Facebook
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-start gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-violet-300/30">
          <Zap className="w-4 h-4 text-yellow-300 mt-0.5 shrink-0" />
          <div>
            <p className="text-yellow-200 font-bold text-sm">PREMIUM ⭐</p>
            <p className="text-white/65 text-xs leading-relaxed mt-0.5">
              All emails — unlimited, any sender, zero restrictions
            </p>
          </div>
        </div>
      </div>

      {/* Clerk form */}
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
      />

      <p className="text-white/25 text-xs mt-8">
        © {new Date().getFullYear()} Weyn Emails · weyn.store · jhames.shop
      </p>
    </div>
  );
}
