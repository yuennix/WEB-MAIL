import { SignUp } from "@clerk/react";
import { Mail, CheckCircle, Zap } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignUpPage() {
  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 40%, #7c3aed 70%, #5b21b6 100%)",
      }}
    >
      {/* Left — marketing + form */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-8 md:px-16 py-12 space-y-8">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl text-white tracking-tight">Weyn Emails</span>
        </div>

        {/* Marketing text */}
        <div className="space-y-4">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Web Domain Email Platform</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            Your Own Email on<br />weyn.store &amp; jhames.shop
          </h1>
          <p className="text-white/75 text-sm md:text-base leading-relaxed max-w-md">
            Create a free account and start catching emails at any alias — like <strong>yourname@weyn.store</strong>. Works instantly, no DNS changes needed on your end.
          </p>

          {/* Tier cards */}
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <CheckCircle className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
              <div>
                <span className="text-white font-bold text-sm">FREE — </span>
                <span className="text-white/75 text-sm">Facebook security code emails only (8-digit verification codes)</span>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-violet-300/30">
              <Zap className="w-4 h-4 text-yellow-300 mt-0.5 shrink-0" />
              <div>
                <span className="text-yellow-200 font-bold text-sm">PREMIUM ⭐ — </span>
                <span className="text-white/75 text-sm">All emails, unlimited, from any sender, no restrictions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clerk form — floats on gradient */}
        <div>
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            fallbackRedirectUrl={`${basePath}/`}
          />
        </div>

        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} Weyn Emails · weyn.store · jhames.shop
        </p>
      </div>

      {/* Right — decorative panel (hidden on mobile) */}
      <div className="hidden md:flex flex-1 items-center justify-center p-12">
        <div className="text-center space-y-6 opacity-20">
          <Mail className="w-32 h-32 text-white mx-auto" />
          <p className="text-white text-2xl font-bold">weyn.store</p>
          <p className="text-white text-2xl font-bold">jhames.shop</p>
        </div>
      </div>
    </div>
  );
}
