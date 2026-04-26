import React from 'react';

/**
 * Reusable Badge component for status, priority, and tags.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Label or content
 * @param {string} props.tone - 'solid' | 'soft' | 'outline' (default: 'soft')
 * @param {string} props.color - 'primary' | 'high' | 'medium' | 'low' | 'warning' | 'muted' (default: 'primary')
 * @param {string} props.size - 'sm' | 'md' (default: 'md')
 * @param {React.ReactNode} props.icon - Optional Lucide icon component
 * @param {string} props.className - Additional classes
 */
const Badge = ({ 
  children, 
  tone = 'soft', 
  color = 'primary', 
  size = 'md', 
  icon: Icon,
  className = '',
  ...props 
}) => {
  const baseClass = 'badge-v2';
  const toneClass = `${baseClass}--${tone}`;
  const colorClass = `${baseClass}--${color}`;
  const sizeClass = `${baseClass}--${size}`;
  
  return (
    <span 
      className={`${baseClass} ${toneClass} ${colorClass} ${sizeClass} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : 14} className="badge-v2-icon" />}
      <span className="badge-v2-content">{children}</span>
    </span>
  );
};

export default Badge;
