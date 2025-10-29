import React from 'react';

const VerifiedBadge = ({ size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        marginLeft: '0.35rem',
        verticalAlign: 'middle',
        display: 'inline-block'
      }}
      title="Verified User"
    >
      <circle cx="12" cy="12" r="10" fill="#10b981" />
      <path
        d="M9 12l2 2 4-4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default VerifiedBadge;
