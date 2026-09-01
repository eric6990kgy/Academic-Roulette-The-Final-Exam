import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "font-bold rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 border-b-4 border-emerald-800 hover:border-emerald-700 disabled:bg-gray-600 disabled:border-gray-800 disabled:text-gray-400",
    secondary: "bg-slate-600 hover:bg-slate-500 text-white shadow-lg shadow-slate-900/50 border-b-4 border-slate-800 hover:border-slate-700 disabled:bg-gray-600 disabled:border-gray-800 disabled:text-gray-400",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/50 border-b-4 border-rose-800 hover:border-rose-700 disabled:bg-gray-600 disabled:border-gray-800 disabled:text-gray-400",
    ghost: "bg-transparent hover:bg-white/10 text-gray-300 border-2 border-transparent hover:border-white/10"
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-8 py-4 text-xl"
  };

  const widthClass = fullWidth ? "w-full" : "";
  const opacityClass = disabled ? "opacity-50 cursor-not-allowed active:scale-100" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${opacityClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;