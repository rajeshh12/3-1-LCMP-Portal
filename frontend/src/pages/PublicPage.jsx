import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, Scale } from "lucide-react";
import { api } from "../services/api.js";

const config = {
  register: {
    eyebrow: "GET STARTED",
    title: "Create a client account",
    description: "Register to access matters shared with you.",
    button: "Create account",
  },
  forgot: {
    eyebrow: "ACCOUNT RECOVERY",
    title: "Reset your password",
    description: "We’ll send a reset link if the email belongs to an account.",
    button: "Send reset link",
  },
  reset: {
    eyebrow: "ACCOUNT RECOVERY",
    title: "Choose a new password",
    description: "Use a strong password of at least 10 characters.",
    button: "Update password",
  },
};

function BrandPanel() {
  return (
    <aside className="lcmp-auth-panel lcmp-auth-panel--brand" aria-label="LCMP brand panel">
      <div className="lcmp-auth-orb orb-one" />
      <div className="lcmp-auth-orb orb-two" />
      <div className="lcmp-auth-brand-row">
        <span className="brand-mark lcmp-crest">L</span>
        <span className="lcmp-brand-word">LCMP</span>
      </div>
      <div className="lcmp-auth-copy">
        <div className="lcmp-auth-kicker">
          <Scale size={20} />
          <span>THE MODERN LEGAL WORKSPACE</span>
        </div>
        <h1>
          Clarity for your
          <br />
          <span>most complex</span> work.
        </h1>
        <p>
          Bring every matter, milestone and client conversation together — so your
          team can focus on the work that matters.
        </p>
        <blockquote>
          “The right details, at the right moment, make all the difference.”
          <footer>LCMP PRACTICE NOTE</footer>
        </blockquote>
      </div>
      <div className="lcmp-auth-footer">
        <span>Trusted by forward-thinking legal teams</span>
        <span>Secure by design • Built for focus</span>
      </div>
    </aside>
  );
}

export default function PublicPage({ mode }) {
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const detail = config[mode];

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") {
        await api.post("/auth/register", { name, email, password });
        setMessage("Account created. You can now sign in.");
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email });
        setMessage("If the account exists, password reset instructions will be sent.");
      } else {
        await api.post("/auth/reset-password", { token: params.get("token"), password });
        setMessage("Password updated. You can now sign in.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";
  const isReset = mode === "reset";
  const showBrandLeft = mode === "register";

  return (
    <main className="lcmp-auth-shell">
      {showBrandLeft ? (
        <>
          <section className="lcmp-auth-panel lcmp-auth-panel--form">
            <div className="lcmp-auth-card lcmp-auth-card--public">
              <div className="lcmp-auth-mobile-brand">
                <span className="brand-mark lcmp-crest">L</span>
                <span className="lcmp-brand-word">LCMP</span>
              </div>
              <div className="lcmp-form-eyebrow">{detail.eyebrow}</div>
              <h2>{detail.title}</h2>
              <p className="lcmp-form-subtitle">{detail.description}</p>
              {error && <div className="lcmp-alert lcmp-alert--error">{error}</div>}
              {message && <div className="lcmp-alert lcmp-alert--success">{message}</div>}

              <form className="lcmp-public-form" onSubmit={submit}>
                {isRegister && (
                  <label className="lcmp-field">
                    <span>Full name</span>
                    <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                )}

                {!isReset && (
                  <label className="lcmp-field">
                    <span>Email address</span>
                    <div className="lcmp-input-shell">
                      <Mail size={16} />
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </label>
                )}

                {(isRegister || isReset) && (
                  <>
                    <label className="lcmp-field">
                      <span>{isRegister ? "Password" : "New password"}</span>
                      <div className="lcmp-input-shell">
                        <KeyRound size={16} />
                        <input
                          required
                          minLength={10}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="lcmp-toggle-button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </label>
                    {isRegister && (
                      <div className="lcmp-password-rules">
                        Use at least 10 characters with a mix of letters and numbers.
                      </div>
                    )}
                  </>
                )}

                <button className="lcmp-primary-button lcmp-public-submit" disabled={busy}>
                  {busy ? "Please wait…" : detail.button}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </form>

              <div className="lcmp-auth-link-row">
                <Link className="lcmp-inline-link" to="/login">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
            </div>
          </section>
          <BrandPanel />
        </>
      ) : (
        <>
          <BrandPanel />
          <section className="lcmp-auth-panel lcmp-auth-panel--form">
            <div className="lcmp-auth-card lcmp-auth-card--public">
              <div className="lcmp-auth-mobile-brand">
                <span className="brand-mark lcmp-crest">L</span>
                <span className="lcmp-brand-word">LCMP</span>
              </div>
              <div className="lcmp-form-eyebrow">{detail.eyebrow}</div>
              <h2>{detail.title}</h2>
              <p className="lcmp-form-subtitle">{detail.description}</p>
              {error && <div className="lcmp-alert lcmp-alert--error">{error}</div>}
              {message && <div className="lcmp-alert lcmp-alert--success">{message}</div>}

              <form className="lcmp-public-form" onSubmit={submit}>
                {isRegister && (
                  <label className="lcmp-field">
                    <span>Full name</span>
                    <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                )}

                {!isReset && (
                  <label className="lcmp-field">
                    <span>Email address</span>
                    <div className="lcmp-input-shell">
                      <Mail size={16} />
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </label>
                )}

                {(isRegister || isReset) && (
                  <>
                    <label className="lcmp-field">
                      <span>{isRegister ? "Password" : "New password"}</span>
                      <div className="lcmp-input-shell">
                        <KeyRound size={16} />
                        <input
                          required
                          minLength={10}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="lcmp-toggle-button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </label>
                    {isRegister && (
                      <div className="lcmp-password-rules">
                        Use at least 10 characters with a mix of letters and numbers.
                      </div>
                    )}
                  </>
                )}

                <button className="lcmp-primary-button lcmp-public-submit" disabled={busy}>
                  {busy ? "Please wait…" : detail.button}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </form>

              <div className="lcmp-auth-link-row">
                <Link className="lcmp-inline-link" to="/login">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

