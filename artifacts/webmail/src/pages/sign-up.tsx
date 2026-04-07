import { useState } from "react";
import { useSignUp, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Mail, CheckCircle, Zap, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignUpPage() {
  const { isLoaded, signUp } = useSignUp();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp!.create({ emailAddress: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/");
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const result = await signUp!.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/");
      }
    } catch (err: any) {
      setVerifyError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Invalid code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(135deg, #3b0764 0%, #4f46e5 35%, #6d28d9 65%, #1e1b4b 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-xl text-white tracking-widest uppercase">WEYN EMAILS</span>
      </div>

      {/* Headline */}
      <div className="text-center mb-5 max-w-md relative z-10">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Web Domain Email Platform</p>
        <h1 className="text-2xl font-extrabold text-white leading-tight">
          Your Own Email on weyn.store &amp; jhames.shop
        </h1>
      </div>

      {/* Tier pills */}
      <div className="flex gap-2 mb-6 relative z-10">
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5">
          <CheckCircle className="w-3 h-3 text-green-300 shrink-0" />
          <span className="text-white font-bold text-xs">FREE</span>
          <span className="text-white/55 text-xs">— Facebook 8 Digits Security Codes Only</span>
        </div>
        <div className="flex items-center gap-1.5 bg-yellow-400/10 backdrop-blur-sm border border-yellow-300/25 rounded-full px-3 py-1.5">
          <Zap className="w-3 h-3 text-yellow-300 shrink-0" />
          <span className="text-yellow-200 font-bold text-xs">PREMIUM</span>
          <span className="text-white/55 text-xs">— all emails, unlimited</span>
        </div>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
        }}
      >
        {!pendingVerification ? (
          <>
            <div className="text-center">
              <h2 className="text-white font-bold text-lg">Create your account</h2>
              <p className="text-white/50 text-xs mt-1">Start receiving emails on your domain</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-white/75 text-xs font-medium block mb-1">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    borderRadius: "0.625rem",
                  }}
                />
              </div>

              <div className="relative">
                <label className="text-white/75 text-xs font-medium block mb-1">Password</label>
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 text-sm pr-10"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    borderRadius: "0.625rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-[1.85rem] text-white/50 hover:text-white/80"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && <p className="text-red-300 text-xs">{error}</p>}

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-10 font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg, #a78bfa, #6d28d9)",
                  border: "none",
                  borderRadius: "0.625rem",
                  boxShadow: "0 4px 15px rgba(109,40,217,0.4)",
                }}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Continue"}
              </Button>
            </form>

            <p className="text-center text-white/40 text-xs">
              Already have an account?{" "}
              <a href={`${basePath}/sign-in`} className="text-violet-300 hover:underline">
                Sign in
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-white font-bold text-lg">Check your email</h2>
              <p className="text-white/50 text-xs mt-1">
                Enter the code sent to <span className="text-white/80">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="text-white/75 text-xs font-medium block mb-1">Verification code</label>
                <Input
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  className="h-10 text-sm tracking-widest text-center"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    borderRadius: "0.625rem",
                  }}
                />
              </div>

              {verifyError && <p className="text-red-300 text-xs">{verifyError}</p>}

              <Button
                type="submit"
                disabled={verifyLoading || !code}
                className="w-full h-10 font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg, #a78bfa, #6d28d9)",
                  border: "none",
                  borderRadius: "0.625rem",
                  boxShadow: "0 4px 15px rgba(109,40,217,0.4)",
                }}
              >
                {verifyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Verify & Sign In"}
              </Button>

              <button
                type="button"
                onClick={() => setPendingVerification(false)}
                className="w-full text-white/40 text-xs hover:text-white/70 transition-colors"
              >
                ← Back
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-white/20 text-[10px] mt-6 relative z-10">
        © {new Date().getFullYear()} WEYN EMAILS
      </p>
    </div>
  );
}
