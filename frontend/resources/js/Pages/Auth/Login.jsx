import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      // 1. Obtenir le cookie CSRF
      await fetch("/sanctum/csrf-cookie", { credentials: "include" });
      const xsrf = decodeURIComponent(
        (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || ""
      );
      // 2. POST sur la route WEB /login → crée la session Laravel
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrf,
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok || res.redirected) {
        // Session établie — redirect vers dashboard
        window.location.href = "/dashboard";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.errors?.email) {
        setError(data.errors.email[0]);
      } else if (data.message) {
        setError(data.message);
      } else {
        setError("Identifiants incorrects.");
      }
    } catch (err) {
      setError("Erreur de connexion. Réessayez.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", fontFamily: "Inter,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: "#7c3aed", borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>SE</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0b1220" }}>Connexion</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Accédez à votre espace SECRETIS ERP</p>
        </div>
        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Email professionnel</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              placeholder="vous@entreprise.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#64748b" }}>
          Pas encore de compte ?{" "}
          <a href="/register" style={{ color: "#7c3aed", fontWeight: 600 }}>Créer un compte</a>
        </p>
        <p style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
          Mot de passe oublié ?{" "}
          <a href="/forgot-password" style={{ color: "#7c3aed" }}>Réinitialiser</a>
        </p>
      </div>
    </div>
  );
}
