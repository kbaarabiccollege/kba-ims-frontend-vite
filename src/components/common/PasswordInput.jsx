// src/components/common/PasswordInput.jsx

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "./Icons";

/**
 * Reusable password field with a show/hide toggle.
 * Manages its own visibility state — callers just treat it
 * like a normal controlled input (value + onChange).
 *
 * `className` lets the <input> pick up whatever page-specific
 * look is needed (e.g. "auth-input"); if the surrounding markup
 * already styles inputs via a tag selector (e.g. .um-field input)
 * you can leave it blank.
 */
const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = "Enter password",
  autoComplete = "current-password",
  required = false,
  disabled = false,
  className = "",
  wrapClassName = "",
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`pw-input-wrap ${wrapClassName}`.trim()}>
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        {...rest}
      />
      <button
        type="button"
        className="pw-eye-btn"
        onClick={() => setShowPassword((v) => !v)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

export default PasswordInput;