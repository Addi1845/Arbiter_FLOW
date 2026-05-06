import React from 'react';

export default function SkeletonRow({ height = '56px', width = '100%', style = {} }) {
  return (
    <div 
      className="skeleton-bg"
      style={{
        height,
        width,
        borderRadius: '2px',
        ...style
      }}
    />
  );
}
