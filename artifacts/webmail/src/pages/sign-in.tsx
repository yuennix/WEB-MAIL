import { SignIn } from "@clerk/react";
import { Mail, CheckCircle, Zap } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left — marketing panel */}
      <div className="relative flex flex-col justify-between md:w-1/2 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-800 p-8 md:p-12 text-white overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">Weyn Emails</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6 py-8 md:py-0">
          <div>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">Web Domain Email</p>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
              Receive Emails on Your<br />
              <span className="text-violet-200">Custom Domain,</span><br />
              Instantly.
            </h1>
            <p className="mt-4 text-white/75 text-sm md:text-base leading-relaxed max-w-md">
              Weyn Emails lets you catch any email sent to <strong>@weyn.store</strong> or <strong>@jhames.shop</strong> — no setup needed. Just type an alias and start receiving.
            </p>
          </div>

          {/* Tier breakdown */}
          <div className="space-y-3">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Plans</p>

            <div className="flex items-start gap-3 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">FREE</p>
                <p className="text-white/70 text-xs mt-0.5 leading-relaxed">
                  Access Facebook security code emails only — 8-digit verification codes from Facebook are shown automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/15 backdrop-blur rounded-xl p-4 border border-violet-300/30">
              <div className="w-8 h-8 rounded-lg bg-violet-400/30 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold text-sm text-yellow-200">PREMIUM ⭐</p>
                <p className="text-white/70 text-xs mt-0.5 leading-relaxed">
                  Receive <strong className="text-white">all emails</strong> — unlimited, from any sender, with no restrictions. Full inbox access 24/7.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} Weyn Emails · weyn.store · jhames.shop
        </p>
      </div>

      {/* Right — Clerk sign-in form */}
      <div className="flex flex-1 items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your Weyn Emails account</p>
          </div>
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            fallbackRedirectUrl={`${basePath}/`}
          />
        </div>
      </div>
    </div>
  );
}
