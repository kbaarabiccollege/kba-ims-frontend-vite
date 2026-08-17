// src/pages/LoginPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axiosInstance";
import { getHomeForRole } from "../../utils/roleUtils";
import { ArrowRightIcon } from "../../components/common/Icons";
import PasswordInput from "../../components/common/PasswordInput";
import '../../styles/login.css';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ user_id: "", password: "" });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.post("/auth/login", formData);
      if (response.data.success) {
        const { user, token } = response.data;
        login(user, token);
        const home = getHomeForRole(user.role);
        navigate(home, { replace: true });
      } else {
        setError(response.data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <div className="login-page">

        {/* ── Building image ── */}
        <div className="login-bg-image">
          <img
            src="/images/kba_entrance.jpg"
            alt="Bukhari Aalim Arabic College campus entrance"
          />
        </div>

        {/* ── Ambient blobs ── */}
        <div className="login-blob login-blob-a" />
        <div className="login-blob login-blob-b" />
        <div className="login-blob login-blob-c" />

        {/* ── Wave shapes ── */}
        <div className="login-waves">
          <svg
            width="560" height="480"
            viewBox="0 0 560 480"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M560 0 C440 40, 500 140, 400 190 C300 240, 360 330, 240 380 C160 410, 200 460, 120 480 L560 480 Z"
              fill="var(--lp-wave-a)"
            />
            <path
              d="M560 0 C480 60, 540 160, 440 220 C340 280, 400 360, 300 410 C230 445, 260 475, 200 480 L560 480 Z"
              fill="var(--lp-wave-b)"
            />
            <path
              d="M560 0 C520 80, 560 180, 480 250 C400 320, 460 400, 380 460 L560 460 Z"
              fill="var(--lp-wave-c)"
            />
          </svg>

          <svg
            style={{ position: 'absolute', bottom: 0, right: 0 }}
            width="340" height="300"
            viewBox="0 0 340 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M340 300 C260 240, 310 160, 220 110 C130 60, 180 0, 80 0 L0 0 L0 300 Z"
              fill="var(--lp-wave-d)"
            />
            <path
              d="M340 300 C290 250, 340 180, 260 140 C180 100, 220 40, 140 0 L340 0 Z"
              fill="var(--lp-wave-e)"
            />
          </svg>
        </div>

        {/* ── Login card ── */}
        <div className="login-card-wrapper">
          <div className="login-card" role="main">

            <h1 className="login-card-title">IMS Portal</h1>
            <p className="login-card-subtitle">Institute Management System</p>
            <div className="login-divider" />

            <form className="auth-form" onSubmit={handleSubmit} noValidate>

              <div className="auth-field">
                <label className="auth-label" htmlFor="user_id">Roll Number / ID</label>
                <div className="auth-input-wrap">
                  <input
                    className="auth-input"
                    id="user_id"
                    name="user_id"
                    type="text"
                    placeholder="Enter your ID"
                    value={formData.user_id}
                    onChange={handleChange}
                    autoComplete="username"
                    spellCheck="false"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="password">Password</label>
                <PasswordInput
  id="password"
  name="password"
  className="auth-input"
  value={formData.password}
  onChange={handleChange}
  placeholder="Enter your password"
  required
/>
              </div>

              <div className="auth-options-row">
                <a href="/forgot-password" className="auth-forgot">Forgot Password?</a>
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Signing In…
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="auth-arrow" aria-hidden="true"><ArrowRightIcon /></span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

      </div>
    </>
  );
};

export default LoginPage;