import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Scale,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext.jsx";

const schema = z.object({ email: z.email(), password: z.string().min(8) });

function BrandPanel() {
  return (
    <aside
      className="lcmp-auth-panel lcmp-auth-panel--brand"
      aria-label="LCMP brand panel"
    >
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
          Bring every matter, milestone and client conversation together — so
          your team can focus on the work that matters.
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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@briefcase.test", password: "DemoPass!234" },
  });
  const [show, setShow] = useState(false);

  async function submit(values) {
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch (err) {
      setError("root.server", { type: "server", message: err.message });
    }
  }

  return (
    <main className="lcmp-auth-shell">
      <BrandPanel />
      <section className="lcmp-auth-panel lcmp-auth-panel--form">
        <form className="lcmp-auth-card" onSubmit={handleSubmit(submit)}>
          <div className="lcmp-auth-mobile-brand">
            <span className="brand-mark lcmp-crest">L</span>
            <span className="lcmp-brand-word">LCMP</span>
          </div>
          <div className="lcmp-form-eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p className="lcmp-form-subtitle">
            Enter your details below to access your portal.
          </p>
          {errors.root?.server && (
            <div className="lcmp-alert lcmp-alert--error">
              {errors.root.server.message}
            </div>
          )}

          <label className="lcmp-field-label">Work email</label>
          <div className="lcmp-input-shell">
            <Mail size={17} />
            <input
              autoComplete="email"
              type="email"
              {...register("email")}
              required
            />
          </div>
          {errors.email && (
            <small className="lcmp-field-error">{errors.email.message}</small>
          )}

          <div className="lcmp-label-row">
            <label className="lcmp-field-label">Password</label>
            <Link className="lcmp-inline-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <div className="lcmp-input-shell">
            <LockKeyhole size={17} />
            <input
              autoComplete="current-password"
              type={show ? "text" : "password"}
              {...register("password")}
              required
              minLength={8}
            />
            <button
              type="button"
              className="lcmp-toggle-button"
              onClick={() => setShow(!show)}
              aria-label="Toggle password visibility"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && (
            <small className="lcmp-field-error">
              {errors.password.message}
            </small>
          )}

          <button className="lcmp-primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>

          <div className="lcmp-demo-box">
            <div className="lcmp-demo-header">
              <span></span>
              <span className="lcmp-demo-badge">SYNTHETIC DATA</span>
            </div>
            <p></p>
            <div className="lcmp-demo-roles">
              {[
                ["Admin", "admin"],
                ["Lawyer", "lawyer"],
                ["Staff", "staff"],
                ["Client", "client"],
              ].map(([label, role]) => (
                <button
                  type="button"
                  key={role}
                  onClick={() =>
                    setValue("email", `${role}@briefcase.test`, {
                      shouldValidate: true,
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="lcmp-legal-copy">
            By continuing, you agree to the{" "}
            <a href="#terms">Terms of Service</a> and{" "}
            <a href="#privacy">Privacy Policy</a>.
            <br />
            New to the portal?{" "}
            <Link to="/register">Create a client account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
