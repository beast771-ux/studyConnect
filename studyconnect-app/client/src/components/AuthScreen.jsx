import { useState } from "react";

export default function AuthScreen({ onSubmit, onResetPassword, loading, error }) {
  const [mode, setMode] = useState("login");
  const [resetMessage, setResetMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload =
      mode === "register"
        ? form
        : {
            email: form.email,
            password: form.password
          };
    await onSubmit(mode, payload);
  }

  async function handleResetPassword() {
    if (!form.email.trim()) {
      setResetMessage("Enter your email first, then click reset password.");
      return;
    }
    const result = await onResetPassword({ email: form.email.trim() });
    setResetMessage(
      `Temporary password: ${result.tempPassword}. Use it to login, then change password in Profile (old password -> new password).`
    );
  }

  return (
    <div className="auth-page">
      <div className="brand-fade" />
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Structured Academic Collaboration</p>
        <h1>StudyConnect</h1>
        <p className="subtitle">
          Topic-based real-time chat, accepted answers, shared resources, and weekly progress.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        {mode === "register" && (
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Shubh Thakkar"
              required
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Minimum 6 characters"
            required
          />
        </label>

        {error && <p className="error-text">{error}</p>}
        {resetMessage && <p className="muted">{resetMessage}</p>}

        {mode === "login" && (
          <button type="button" className="inline-link" onClick={handleResetPassword}>
            Forgot Password
          </button>
        )}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Enter Workspace" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
