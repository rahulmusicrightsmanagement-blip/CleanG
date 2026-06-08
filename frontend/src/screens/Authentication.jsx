/* ============================================================
   Authentication — sign in
   ============================================================ */
import React, { useState } from "react";
import { Icon } from "../components/ui.jsx";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function Authentication({ onSignin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [topErr, setTopErr] = useState(null);

  function submit() {
    const e = {};
    if (!email.trim()) e.email = "Email is required."; else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const err = onSignin(email, password);
    if (err) setTopErr(err);
  }
  function onKey(ev) { if (ev.key === "Enter") submit(); }

  return React.createElement("div", { className: "auth" },
    React.createElement("div", { className: "auth-brand" },
      React.createElement("div", { className: "auth-grid" }),
      React.createElement("div", { className: "auth-brand-top" },
        React.createElement("span", { className: "auth-logo" },
          React.createElement("span", { className: "dot" }), "G-Cleanser",
          React.createElement("span", { className: "auth-wt" }, "working title"))),
      React.createElement("div", { className: "auth-brand-mid" },
        React.createElement("h1", null, "One messy catalog in.", React.createElement("br", null), "One trusted list out."),
        React.createElement("p", null, "Sign in to your workspace. Every cleanse you run lives in your own branch — isolated, owned by you, and accessible to your team without ever being merged.")),
      React.createElement("ul", { className: "auth-feats" },
        featLine("Your branches, under your account"),
        featLine("Automated cleaning + human review"),
        featLine("Browse & adopt teammates' decisions")),
      React.createElement("div", { className: "auth-brand-foot" }, "Goongoonalo · Music Catalog Data Cleansing")),
    React.createElement("div", { className: "auth-form-wrap" },
      React.createElement("div", { className: "auth-card" },
        React.createElement("div", { className: "auth-mobile-logo" },
          React.createElement("span", { className: "dot" }), "G-Cleanser"),
        React.createElement("h2", { className: "auth-h" }, "Welcome back"),
        React.createElement("p", { className: "auth-sub" }, "Sign in to pick up your branches where you left off."),
        topErr ? React.createElement("div", { className: "auth-toperr" }, React.createElement(Icon, { name: "alert", size: 15 }), topErr) : null,
        field("Email", React.createElement("input", {
          className: "tinput" + (errors.email ? " err" : ""), placeholder: "you@goongoonalo.com", type: "email", value: email,
          onChange: function (e) { setEmail(e.target.value); }, onKeyDown: onKey, autoFocus: true,
        }), errors.email),
        field("Password", React.createElement("div", { className: "pw-wrap" },
          React.createElement("input", {
            className: "tinput" + (errors.password ? " err" : ""), placeholder: "Your password",
            type: showPw ? "text" : "password", value: password,
            onChange: function (e) { setPassword(e.target.value); }, onKeyDown: onKey,
            style: { paddingRight: 44 },
          }),
          React.createElement("button", {
            type: "button", className: "pw-toggle", "aria-label": showPw ? "Hide password" : "Show password",
            title: showPw ? "Hide password" : "Show password",
            onClick: function () { setShowPw(!showPw); },
          }, React.createElement(Icon, { name: showPw ? "eyeOff" : "eye", size: 17 }))), errors.password),
        React.createElement("button", { className: "btn pri auth-submit", onClick: submit },
          "Sign in", React.createElement(Icon, { name: "arrowR", size: 16 })))));
}

function field(label, input, err) {
  return React.createElement("div", { className: "auth-field", key: label },
    React.createElement("label", { className: "field-label" }, label), input,
    err ? React.createElement("div", { className: "field-err" }, err) : null);
}
function featLine(t) {
  return React.createElement("li", { key: t },
    React.createElement("span", { className: "fk" }, React.createElement(Icon, { name: "check", size: 13 })), t);
}
