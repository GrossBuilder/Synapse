"use client";

import { ReactNode } from "react";

// ==================== BUTTON ====================

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-300",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-medium transition-all duration-200 inline-flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </button>
  );
}

// ==================== CARD ====================

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div
      className={`
        bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm
        ${padding ? "p-6" : ""} ${className}
      `}
    >
      {children}
    </div>
  );
}

// ==================== ICON BUTTON ====================

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  active?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  icon,
  onClick,
  variant = "secondary",
  active = false,
  label,
  size = "md",
}: IconButtonProps) {
  const variants = {
    primary: active ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white",
    secondary: active ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white",
  };

  const sizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className={`
          rounded-full flex items-center justify-center transition-all duration-200
          hover:scale-105 active:scale-95
          ${variants[variant]} ${sizes[size]}
        `}
      >
        {icon}
      </button>
      {label && <span className="text-xs text-gray-500">{label}</span>}
    </div>
  );
}
